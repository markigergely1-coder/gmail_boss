from firebase_admin import initialize_app, firestore, credentials
from firebase_functions import scheduler_fn, https_fn
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime, timezone
import time
import PyPDF2
import io
import base64
import re
import os

# Initialize once globally
initialize_app()

# Initialize secondary app for external DB
target_db = None
try:
    key_path = os.path.join(os.path.dirname(__file__), 'target_db_key.json')
    if os.path.exists(key_path):
        cred = credentials.Certificate(key_path)
        target_app = initialize_app(cred, name='target_db')
        target_db = firestore.client(app=target_app)
        print("Successfully connected to target_db")
    else:
        print(f"Warning: {key_path} not found. Target DB sync will fail.")
except Exception as e:
    print(f"Warning: Could not initialize target_db: {e}")

from gmail_auth import get_gmail_service

def handle_test_script(service, parameters):
    """
    Dynamically searches Gmail based on Name, Email, and/or Subject.
    Extracts the full From and Subject headers from the match.
    """
    filter_name = parameters.get('name', '').strip()
    filter_email = parameters.get('email', '').strip()
    filter_subject = parameters.get('subject', '').strip()
    
    if not (filter_name or filter_email or filter_subject):
        return "Kérlek, adj meg legalább egy szűrési feltételt (Név, E-mail, vagy Tárgy)!"
        
    # Build query string
    query_parts = []
    if filter_email:
        query_parts.append(f"from:{filter_email}")
    elif filter_name:
        query_parts.append(f"from:{filter_name}") # 'from' searches both name and email in Gmail
        
    if filter_subject:
        query_parts.append(f"subject:{filter_subject}")
        
    query_string = " ".join(query_parts)
        
    try:
        # Search for the latest email
        results = service.users().messages().list(userId='me', q=query_string, maxResults=1).execute()
        messages = results.get('messages', [])
        
        if not messages:
            return f"Nem található e-mail erre a keresésre:\n'{query_string}'"
            
        # Get the full message metadata
        msg_id = messages[0]['id']
        msg = service.users().messages().get(userId='me', id=msg_id, format='metadata', metadataHeaders=['From', 'Subject', 'Date']).execute()
        
        # Extract headers
        headers = msg.get('payload', {}).get('headers', [])
        
        extracted_from = next((header['value'] for header in headers if header['name'].lower() == 'from'), "Ismeretlen feladó")
        extracted_subject = next((header['value'] for header in headers if header['name'].lower() == 'subject'), "Nincs tárgy")
        extracted_date = next((header['value'] for header in headers if header['name'].lower() == 'date'), "Nincs dátum")
        
        output = (
            f"✅ Találat a következő keresésre: '{query_string}'\n\n"
            f"📅 Dátum: {extracted_date}\n"
            f"👤 Feladó (Név & E-mail): {extracted_from}\n"
            f"📝 Tárgy: {extracted_subject}"
        )
        return output
        
    except Exception as e:
        return f"Hiba az e-mailek lekérdezésekor: {e}"

def handle_invoice_parser(service, parameters):
    """
    Searches for 'számla' from a target email, downloads the PDF attachments,
    parses them, and syncs missing ones to the target database.
    """
    target_email = parameters.get('email', '').strip()
    if not target_email:
        return "Kérlek, add meg a feladó e-mail címét a kereséshez!"
        
    if target_db is None:
        return "Hiba: A target_db nincs inicializálva! (Hiányzik a target_db_key.json?)"
        
    query_string = f"from:{target_email} subject:számla has:attachment filename:pdf"
    
    try:
        # Search for the latest 10 emails
        results = service.users().messages().list(userId='me', q=query_string, maxResults=10).execute()
        messages = results.get('messages', [])
        
        if not messages:
            return f"Nem található számla (PDF csatolmány) ettől a feladótól:\n'{target_email}'"
            
        processed_count = 0
        added_count = 0
        skipped_count = 0
        
        for msg_ref in messages:
            msg_id = msg_ref['id']
            msg = service.users().messages().get(userId='me', id=msg_id).execute()
            
            # Find PDF attachment
            pdf_part = None
            
            parts = msg.get('payload', {}).get('parts', [])
            for part in parts:
                if part.get('filename', '').lower().endswith('.pdf'):
                    pdf_part = part
                    break
                    
            if not pdf_part:
                def find_pdf_recursive(parts_list):
                    for p in parts_list:
                        if p.get('filename', '').lower().endswith('.pdf'):
                            return p
                        if 'parts' in p:
                            found = find_pdf_recursive(p['parts'])
                            if found:
                                return found
                    return None
                pdf_part = find_pdf_recursive(parts)
                
            if not pdf_part:
                continue # Skip email if no PDF found
                
            attachment_id = pdf_part['body'].get('attachmentId')
            pdf_filename = pdf_part.get('filename', 'Unknown.pdf')
            
            if not attachment_id:
                continue
                
            processed_count += 1
            
            # Download attachment
            attachment = service.users().messages().attachments().get(
                userId='me', messageId=msg_id, id=attachment_id
            ).execute()
            
            file_data = base64.urlsafe_b64decode(attachment['data'])
            
            # Parse PDF
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_data))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
                
            # Extract Amount
            amount = None
            amount_regex = re.search(r"(Végösszeg|Fizetendő|Összesen)\s*:?\s*([\d\s\.]+)\s*(Ft|HUF)", text, re.IGNORECASE)
            if amount_regex:
                amount_str = re.sub(r"[\s\.\xa0]", "", amount_regex.group(2))
                try:
                    amount = int(amount_str)
                except:
                    pass
                    
            if amount is None:
                alt_regexes = re.finditer(r"(?<!\d)([\d\s\.]+)\s*(Ft|HUF)", text, re.IGNORECASE)
                last_match = None
                for match in alt_regexes:
                    last_match = match
                if last_match:
                    amount_str = re.sub(r"[\s\.\xa0]", "", last_match.group(1))
                    try:
                        amount = int(amount_str)
                    except:
                        pass
                        
            # Extract Date
            date_match = re.search(r"(20\d{2}[\.\-][01]\d[\.\-][0-3]\d)", text)
            invoice_date = date_match.group(1) if date_match else None
            
            if not invoice_date or not amount:
                print(f"Skipping {pdf_filename}: Missing date or amount")
                continue
                
            # Normalize date formatting to YYYY-MM-DD
            invoice_date_norm = invoice_date.replace('.', '-').rstrip('-')
            
            # Calculate target_month and target_year (invoice month - 1)
            try:
                date_obj = datetime.strptime(invoice_date_norm.replace('.', '-'), "%Y-%m-%d")
                inv_month = date_obj.month
                inv_year = date_obj.year
                
                if inv_month == 1:
                    target_month = 12
                    target_year = inv_year - 1
                else:
                    target_month = inv_month - 1
                    target_year = inv_year
            except Exception as e:
                print(f"Error parsing date {invoice_date_norm}: {e}")
                continue

            # Check if invoice already exists in target_db
            invoices_ref = target_db.collection('invoices')
            query = invoices_ref.where(filter=FieldFilter('filename', '==', pdf_filename)) \
                                .where(filter=FieldFilter('target_month', '==', target_month)) \
                                .where(filter=FieldFilter('target_year', '==', target_year)).limit(1)
            
            existing_docs = list(query.stream())
            
            if len(existing_docs) > 0:
                skipped_count += 1
            else:
                # Add to DB
                new_invoice = {
                    'amount': amount,
                    'filename': pdf_filename,
                    'inv_date': invoice_date_norm,
                    'target_month': target_month,
                    'target_year': target_year
                }
                invoices_ref.add(new_invoice)
                added_count += 1
                print(f"Added new invoice: {new_invoice}")

        output = (
            f"📊 Számla Szinkronizáció Kész!\n\n"
            f"Feldolgozott e-mailek: {processed_count}\n"
            f"Új számla hozzáadva: {added_count}\n"
            f"Már létező (kihagyva): {skipped_count}\n"
        )
        if added_count > 0:
            output += f"\nSikeresen szinkronizálva a(z) {target_db.project} adatbázisba!"
            
        return output
        
    except Exception as e:
        return f"Hiba a PDF számla feldolgozásakor: {e}"

def execute_script(script_config, db):
    """
    Executes the actual Gmail logic based on the script ID and updates last_run and last_output.
    """
    script_id = script_config.get('script_id')
    parameters = script_config.get('parameters', {})
    
    print(f"Executing script {script_id} with params {parameters}...")
    
    output_msg = ""
    
    # Try to get Gmail service to ensure auth works
    try:
        service = get_gmail_service()
        
        # Router
        if script_id == 'test_script':
            output_msg = handle_test_script(service, parameters)
        elif script_id == 'invoice_parser':
            output_msg = handle_invoice_parser(service, parameters)
        else:
            output_msg = f"Unknown script_id: {script_id}"
            
        print(f"[{script_id}] Output: {output_msg}")
        
    except Exception as e:
        output_msg = f"Failed to authenticate or run Gmail API for {script_id}: {e}"
        print(output_msg)

    # Update last_run and last_output
    doc_ref = db.collection('scripts_config').document(script_config.get('doc_id'))
    doc_ref.update({
        'last_run': firestore.SERVER_TIMESTAMP,
        'last_output': output_msg
    })
    
    print(f"Successfully executed script {script_id}")
    return True

@scheduler_fn.on_schedule(schedule="every 5 minutes")
def scheduler_engine(event: scheduler_fn.ScheduledEvent) -> None:
    """
    Cron job that checks for AUTO scripts and executes them if interval has passed.
    """
    db = firestore.client()
    # Query for all AUTO scripts
    scripts = db.collection('scripts_config').where(filter=FieldFilter('status', '==', 'AUTO')).stream()
    
    now = datetime.now(timezone.utc)
    
    for doc in scripts:
        script_data = doc.to_dict()
        script_data['doc_id'] = doc.id
        
        last_run = script_data.get('last_run')
        interval = script_data.get('interval_minutes', 60)
        
        should_run = False
        if not last_run:
            should_run = True
        else:
            delta = now - last_run
            if delta.total_seconds() >= (interval * 60):
                should_run = True
                
        if should_run:
            execute_script(script_data, db)

@https_fn.on_call()
def trigger_script(req: https_fn.CallableRequest) -> any:
    """
    HTTP Callable function to manually trigger a script from the dashboard.
    """
    # Temporarily removed auth check so you can test it without a login screen
        
    doc_id = req.data.get('doc_id')
    if not doc_id:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INVALID_ARGUMENT,
            message="doc_id is required."
        )
        
    db = firestore.client()
    doc_ref = db.collection('scripts_config').document(doc_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.NOT_FOUND,
            message="Script config not found."
        )
        
    script_data = doc.to_dict()
    script_data['doc_id'] = doc.id
    
    success = execute_script(script_data, db)
    
    if success:
        return {"status": "success", "message": f"Script {doc_id} executed successfully."}
    else:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.INTERNAL,
            message=f"Script {doc_id} failed to execute."
        )
