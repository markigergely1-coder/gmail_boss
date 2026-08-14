from firebase_admin import initialize_app, firestore
from firebase_functions import scheduler_fn, https_fn
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime, timezone
import time

# Initialize once globally
initialize_app()

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
