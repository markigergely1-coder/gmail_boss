import os
import sys
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError

SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

def upload_to_firestore(token_data):
    import subprocess
    script_path = os.path.join(os.path.dirname(__file__), 'frontend', 'sync_token.mjs')
    if os.path.exists(script_path):
        print("Uploading new token to Firestore via Firebase Client SDK (sync_token.mjs)...")
        res = subprocess.run(['node', 'sync_token.mjs'], cwd=os.path.join(os.path.dirname(__file__), 'frontend'))
        if res.returncode == 0:
            print("✅ Token sikeresen feltöltve a Firestore-ba (config/gmail_auth)!")
            return

    try:
        import firebase_admin
        from firebase_admin import firestore
        try:
            app = firebase_admin.get_app()
        except ValueError:
            app = firebase_admin.initialize_app()
            
        db = firestore.client()
        print("Uploading new token to Firestore (config/gmail_auth)...")
        db.collection('config').document('gmail_auth').set(token_data)
        print("✅ Token sikeresen feltöltve a Firestore-ba (config/gmail_auth)!")
    except Exception as e:
        print(f"⚠️ Nem sikerült automatikusan feltölteni a Firestore-ba: {e}")
        print("Kérlek futtasd le kézzel a következőt: python upload_token.py")

def main():
    force_new = '--force' in sys.argv or '--new' in sys.argv
    creds = None

    if os.path.exists('token.json') and not force_new:
        try:
            with open('token.json', 'r') as token:
                creds = Credentials.from_authorized_user_info(json.load(token), SCOPES)
        except Exception as e:
            print(f"Hiba a meglévő token.json olvasásakor: {e}")
            creds = None

    needs_login = False

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token and not force_new:
            print("Meglévő token lejárt, frissítés kísérlete...")
            try:
                creds.refresh(Request())
                print("✅ Token sikeresen megújítva a refresh token segítségével!")
            except RefreshError as re:
                print(f"⚠️ A refresh token érvénytelen (invalid_grant: {re}).")
                print("Új bejelentkezés szükséges a Google fiókoddal...")
                needs_login = True
            except Exception as e:
                print(f"⚠️ Nem sikerült a token frissítése: {e}")
                needs_login = True
        else:
            needs_login = True

    if needs_login:
        print("=========================================================================")
        print("Új Google Gmail engedélyezési folyamat indítása...")
        print("Hamarosan megnyílik a böngészőablak a bejelentkezéshez.")
        print("Kérlek, jelentkezz be és engedélyezd a kért Gmail jogosultságokat.")
        print("=========================================================================")

        if not os.path.exists('credentials.json'):
            print("❌ Hiba: 'credentials.json' nem található a projekt gyökerében.")
            print("Kérlek töltsd le a Google Cloud Console-ból (OAuth 2.0 Client ID)!")
            return

        flow = InstalledAppFlow.from_client_secrets_file('credentials.json', SCOPES)
        creds = flow.run_local_server(port=0)

    # Save credentials locally
    print("\nÚj token mentése a 'token.json' fájlba...")
    token_json_str = creds.to_json()
    with open('token.json', 'w') as token_file:
        token_file.write(token_json_str)

    print("✅ 'token.json' sikeresen elmentve!")

    # Upload directly to Firestore so cloud functions immediately get the new token
    token_data = json.loads(token_json_str)
    upload_to_firestore(token_data)

    print("\n🎉 Kész! A Gmail hozzáférés mostantól teljesen működőképes a Cloud Functionökben is.")

if __name__ == '__main__':
    main()
