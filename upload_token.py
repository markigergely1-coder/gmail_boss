import os
import sys
import json
import subprocess

def main():
    if not os.path.exists('token.json'):
        print("Error: 'token.json' not found. Please run generate_token.py first.")
        return

    # Use frontend/sync_token.mjs which connects directly using Firebase Client SDK
    script_path = os.path.join(os.path.dirname(__file__), 'frontend', 'sync_token.mjs')
    if os.path.exists(script_path):
        print("Uploading to Firestore via Firebase Client SDK (sync_token.mjs)...")
        res = subprocess.run(['node', 'sync_token.mjs'], cwd=os.path.join(os.path.dirname(__file__), 'frontend'))
        if res.returncode == 0:
            return

    # Fallback to firebase_admin if node fails
    try:
        import firebase_admin
        from firebase_admin import firestore
        try:
            app = firebase_admin.get_app()
        except ValueError:
            app = firebase_admin.initialize_app()
        db = firestore.client()
        with open('token.json', 'r') as f:
            token_data = json.load(f)
        db.collection('config').document('gmail_auth').set(token_data)
        print("✅ Successfully uploaded token to Firestore!")
    except Exception as e:
        print(f"Error uploading via Admin SDK: {e}")

if __name__ == '__main__':
    main()
