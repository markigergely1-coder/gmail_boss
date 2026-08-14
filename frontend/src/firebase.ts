import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Your web app's Firebase configuration
// For local emulator testing, this can be largely empty/dummy, but good to have a real one eventually.
const firebaseConfig = {
  projectId: "boss-ca4b6",
  appId: "1:890558664908:web:2ff2a2a065a1f82cd87269",
  storageBucket: "boss-ca4b6.firebasestorage.app",
  apiKey: "AIzaSyDuxs4v5R_eaS8hd1oyu30v8UAH-wobBPU",
  authDomain: "boss-ca4b6.firebaseapp.com",
  messagingSenderId: "890558664908",
  projectNumber: "890558664908",
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
