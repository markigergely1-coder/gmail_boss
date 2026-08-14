import json
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from firebase_admin import firestore

SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

def get_gmail_service():
    """
    Fetches the OAuth credentials from Firestore (config/gmail_auth)
    and returns an authorized Gmail API service instance.
    """
    db = firestore.client()
    doc_ref = db.collection('config').document('gmail_auth')
    doc = doc_ref.get()
    
    if not doc.exists:
        raise Exception("Gmail authentication token not found in Firestore. Please run upload_token.py first.")
    
    token_data = doc.to_dict()
    
    creds = Credentials.from_authorized_user_info(token_data, SCOPES)
    service = build('gmail', 'v1', credentials=creds)
    return service
