
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore, Timestamp } from "firebase/firestore"; // Import Timestamp

// These are placeholders and should be overridden by your .env.local file
// or Vercel environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let authInstance: ReturnType<typeof getAuth>;
let storageInstance: ReturnType<typeof getStorage>;
let dbInstance: ReturnType<typeof getFirestore>;

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("CRITICAL FIREBASE CONFIG ERROR: NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or undefined.");
  console.error("This will cause Firebase services (Auth, Firestore, Storage) to fail.");
  console.error("Ensure these are correctly set in your .env.local file (for local development) AND in your Vercel project environment variables (for deployment).");
}

console.log("Firebase Initializing with Project ID:", firebaseConfig.projectId || "MISSING/UNDEFINED");
console.log("Firebase Using API Key (first 5 chars):", firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0,5) + "..." : "API Key Not Found/Defined");

if (!getApps().length) {
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Firebase initializeApp error:", e);
    // In a real app, you might want to throw this error or handle it more gracefully
    // For now, subsequent getAuth/getStorage/getFirestore calls will fail if app is undefined.
  }
} else {
  app = getApps()[0];
}

// Initialize other Firebase services only if app was successfully initialized
// @ts-ignore app might be uninitialized if config is missing
if (app && firebaseConfig.apiKey && firebaseConfig.projectId) { // Add check for apiKey and projectId
  authInstance = getAuth(app);
  storageInstance = getStorage(app);
  dbInstance = getFirestore(app);
} else {
  console.error("Firebase app was not properly initialized due to missing configuration. Other Firebase services (Auth, Storage, Firestore) will NOT be available.");
  // Assign null or throw an error to prevent undefined access later
  // @ts-ignore
  authInstance = null; 
  // @ts-ignore
  storageInstance = null;
  // @ts-ignore
  dbInstance = null;
}

// Exporting with new names to avoid conflict with the getAuth import
export { app, authInstance as auth, storageInstance as storage, dbInstance as db, Timestamp };
