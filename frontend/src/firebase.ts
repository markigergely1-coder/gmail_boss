import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Your web app's Firebase configuration
// For local emulator testing, this can be largely empty/dummy, but good to have a real one eventually.
const firebaseConfig = {
  projectId: "boss-ca4b6",
  // Other fields would be populated from your Firebase Console if deploying to production
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);
const functions = getFunctions(app);

// Connect to emulators if running locally
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log("Connecting to Firebase Emulators...");
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

export { db, functions };
