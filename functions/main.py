from firebase_admin import initialize_app, firestore
from firebase_functions import scheduler_fn, https_fn
from google.cloud.firestore_v1.base_query import FieldFilter
from datetime import datetime, timezone
import time

# Initialize once globally
initialize_app()

from gmail_auth import get_gmail_service

def execute_script(script_config, db):
    """
    Executes the actual Gmail logic based on the script ID and updates last_run.
    """
    script_id = script_config.get('script_id')
    parameters = script_config.get('parameters', {})
    
    print(f"Executing script {script_id} with params {parameters}...")
    
    # Try to get Gmail service to ensure auth works
    try:
        service = get_gmail_service()
        # For now, let's just fetch the profile to prove it works.
        profile = service.users().getProfile(userId='me').execute()
        print(f"[{script_id}] Authenticated as: {profile.get('emailAddress')}")
        
    except Exception as e:
        print(f"Failed to authenticate or run Gmail API for {script_id}: {e}")
        return False

    # Update last_run
    doc_ref = db.collection('scripts_config').document(script_config.get('doc_id'))
    doc_ref.update({
        'last_run': firestore.SERVER_TIMESTAMP
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
    # Verify auth
    if not req.auth:
        raise https_fn.HttpsError(
            code=https_fn.FunctionsErrorCode.UNAUTHENTICATED,
            message="User must be authenticated."
        )
        
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
