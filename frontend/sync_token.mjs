import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const firebaseConfig = {
  projectId: "boss-ca4b6",
  appId: "1:890558664908:web:2ff2a2a065a1f82cd87269",
  storageBucket: "boss-ca4b6.firebasestorage.app",
  apiKey: "AIzaSyDuxs4v5R_eaS8hd1oyu30v8UAH-wobBPU",
  authDomain: "boss-ca4b6.firebaseapp.com",
  messagingSenderId: "890558664908",
  projectNumber: "890558664908",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const tokenPath = path.resolve('..', 'token.json');

if (!fs.existsSync(tokenPath)) {
  console.error("❌ token.json not found at:", tokenPath);
  process.exit(1);
}

const tokenRaw = fs.readFileSync(tokenPath, 'utf8');
const tokenData = JSON.parse(tokenRaw);

console.log("Uploading token to Firestore config/gmail_auth...");

try {
  await setDoc(doc(db, 'config', 'gmail_auth'), tokenData);
  console.log("✅ Token successfully uploaded to Firestore (config/gmail_auth)!");
  process.exit(0);
} catch (err) {
  console.error("❌ Failed to upload token:", err);
  process.exit(1);
}
