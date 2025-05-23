
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from "firebase/auth"; // Ensure Auth is typed
import { getStorage, type FirebaseStorage } from "firebase/storage"; // Ensure FirebaseStorage is typed
import { getFirestore, Timestamp, type Firestore } from "firebase/firestore"; // Ensure Firestore is typed

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | undefined = undefined; // Initialize as undefined
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;
let dbInstance: Firestore | null = null;

// Check if all required config keys are present
const requiredKeys: (keyof typeof firebaseConfig)[] = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error("CRITICAL FIREBASE CONFIG ERROR: The following Firebase config keys are missing or undefined in your environment variables:", missingKeys.join(', '));
  console.error("This will cause Firebase services (Auth, Firestore, Storage) to fail or not initialize.");
  console.error("Ensure these are correctly set in your .env.local file (for local development) AND in your Vercel project environment variables (for deployment).");
} else {
  console.log("Firebase Config OK: All required keys found.");
  console.log("Firebase Initializing with Project ID:", firebaseConfig.projectId);
  console.log("Firebase Using API Key (first 5 chars):", firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) + "..." : "API Key Not Found/Defined");

  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully.");
    } catch (e) {
      console.error("Firebase initializeApp error:", e);
      app = undefined; // Ensure app is undefined on error
    }
  } else {
    app = getApps()[0];
    console.log("Firebase app already initialized.");
  }
}

if (app) {
  try {
    authInstance = getAuth(app);
    storageInstance = getStorage(app);
    dbInstance = getFirestore(app);
    console.log("Firebase services (Auth, Storage, Firestore) initialized.");
  } catch (serviceError) {
    console.error("Error initializing Firebase services (Auth, Storage, Firestore):", serviceError);
    authInstance = null;
    storageInstance = null;
    dbInstance = null;
  }
} else {
  console.error("Firebase app was not initialized. Other Firebase services (Auth, Storage, Firestore) will NOT be available.");
}

export { app, authInstance as auth, storageInstance as storage, dbInstance as db, Timestamp };
