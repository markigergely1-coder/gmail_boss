import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

def main():
    if not os.path.exists('token.json'):
        print("Error: 'token.json' not found. Please run generate_token.py first.")
        return

    # Initialize Firebase Admin
    # For this to work against your real project, you must either be logged in via Google Cloud CLI 
    # (`gcloud auth application-default login`) OR provide a service account key.
    # We will attempt to use the default credentials.
    try:
        app = firebase_admin.initialize_app()
    except ValueError:
        # If already initialized
        app = firebase_admin.get_app()
        
    db = firestore.client()
    
    print("Reading token.json...")
    with open('token.json', 'r') as f:
        token_data = json.load(f)
        
    print("Uploading to Firestore (config/gmail_auth)...")
    db.collection('config').document('gmail_auth').set(token_data)
    
    print("✅ Successfully uploaded token to Firestore!")

if __name__ == '__main__':
    main()
