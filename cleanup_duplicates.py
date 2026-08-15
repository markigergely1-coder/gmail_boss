"""
Script to remove duplicate invoices from the target Firestore database.
Duplicates are identified by having the same target_month + target_year + amount.
Keeps the first one, deletes the rest.
"""
import os
import sys

# Add functions dir to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'functions'))

from google.cloud import firestore

key_path = os.path.join(os.path.dirname(__file__), 'functions', 'target_db_key.json')
if not os.path.exists(key_path):
    print(f"ERROR: {key_path} not found!")
    sys.exit(1)

db = firestore.Client.from_service_account_json(key_path)

print("Fetching all invoices from target database...")
invoices_ref = db.collection('invoices')
all_docs = list(invoices_ref.stream())

print(f"Found {len(all_docs)} total invoices.\n")

# Group by (target_month, target_year, amount) to find duplicates
groups = {}
for doc in all_docs:
    data = doc.to_dict()
    key = (data.get('target_month'), data.get('target_year'), data.get('amount'))
    if key not in groups:
        groups[key] = []
    groups[key].append({'id': doc.id, 'data': data})

# Find and delete duplicates
deleted_count = 0
for key, docs in groups.items():
    if len(docs) > 1:
        month, year, amount = key
        print(f"Duplikatum: honap={month}, ev={year}, osszeg={amount} Ft - {len(docs)} db")
        # Keep the first, delete the rest
        for dup in docs[1:]:
            print(f"  -> Torles: {dup['id']} (filename={dup['data'].get('filename', '?')})")
            invoices_ref.document(dup['id']).delete()
            deleted_count += 1

print(f"\nDone! {deleted_count} duplicate(s) deleted.")
print(f"Remaining: {len(all_docs) - deleted_count} invoices.")
