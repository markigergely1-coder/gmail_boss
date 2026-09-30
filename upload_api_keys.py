import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import json
import os

def upload_keys():
    print("=== API Kulcsok feltöltése a Firebase-be ===")
    
    # 1. Initialize Firebase Admin SDK (requires credentials.json)
    try:
        firebase_admin.initialize_app()
    except ValueError:
        pass

    db = firestore.client()

    # 2. Get keys from user
    gemini_key = input("Kérlek add meg a Gemini API kulcsot (hagyd üresen, ha nem akarod módosítani): ").strip()
    telegram_token = input("Kérlek add meg a Telegram Bot Tokent (hagyd üresen, ha nem akarod módosítani): ").strip()

    if not gemini_key and not telegram_token:
        print("Nem adtál meg új kulcsot. Kilépés.")
        return

    # 3. Prepare data to upload
    doc_ref = db.collection('config').document('api_keys')
    existing_data = {}
    
    try:
        doc = doc_ref.get()
        if doc.exists:
            existing_data = doc.to_dict()
    except Exception as e:
        print(f"Hiba a meglévő adatok lekérdezésekor: {e}")

    if gemini_key:
        existing_data['gemini_api_key'] = gemini_key
    if telegram_token:
        existing_data['telegram_bot_token'] = telegram_token

    # 4. Upload to Firestore
    try:
        doc_ref.set(existing_data)
        print("✅ API kulcsok sikeresen feltöltve a Firestore 'config/api_keys' dokumentumba!")
    except Exception as e:
        print(f"❌ Hiba a feltöltés során: {e}")

if __name__ == '__main__':
    upload_keys()
