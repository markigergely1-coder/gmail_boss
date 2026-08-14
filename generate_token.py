import os
import json
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

# If modifying these scopes, delete the file token.json.
SCOPES = ['https://www.googleapis.com/auth/gmail.modify']

def main():
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists('token.json'):
        with open('token.json', 'r') as token:
            creds = Credentials.from_authorized_user_info(json.load(token), SCOPES)
            
    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Token expired, refreshing...")
            creds.refresh(Request())
        else:
            print("=========================================================================")
            print("No valid token found. Initiating login flow...")
            print("A browser window will open shortly.")
            print("Please log in with your Google Account and grant the requested permissions.")
            print("=========================================================================")
            if not os.path.exists('credentials.json'):
                print("Error: 'credentials.json' not found in the root directory.")
                print("Please download it from the Google Cloud Console and place it in the root directory of this project.")
                return

            flow = InstalledAppFlow.from_client_secrets_file(
                'credentials.json', SCOPES)
            creds = flow.run_local_server(port=0)
            
        # Save the credentials for the next run
        print("\nSaving new token to 'token.json'...")
        with open('token.json', 'w') as token:
            token.write(creds.to_json())
            
    print("\n✅ Authentication successful! 'token.json' is ready to use.")
    print("Your refresh token has been stored securely in token.json (and is ignored by git).")

if __name__ == '__main__':
    main()
