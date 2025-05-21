
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore"; 

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
let auth: ReturnType<typeof getAuth>;
let storage: ReturnType<typeof getStorage>;
let db: ReturnType<typeof getFirestore>;

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("CRITICAL FIREBASE CONFIG ERROR: NEXT_PUBLIC_FIREBASE_API_KEY or NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or undefined.");
  console.error("Using API Key (first 5 chars):", firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0,5) + "..." : "MISSING/UNDEFINED");
  console.error("Using Project ID:", firebaseConfig.projectId || "MISSING/UNDEFINED");
  // In a real build, this might still proceed but Firebase services will fail.
  // Forcing an error here during build might be too disruptive if only some services are affected.
  // However, this log should be very apparent in build outputs.
} else {
  if (!getApps().length) {
    try {
      console.log("Firebase Initializing with Project ID:", firebaseConfig.projectId);
      console.log("Firebase Using API Key (first 5 chars):", firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0,5) + "..." : "API Key Not Found/Defined");
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase initializeApp error:", e);
      // Potentially rethrow or handle if app cannot be initialized
      // For now, this will likely cause subsequent getAuth/getStorage/getFirestore to fail if app is undefined.
    }
  } else {
    app = getApps()[0];
    console.log("Firebase Re-using existing app instance for Project ID:", app.options.projectId);
  }

  // Initialize other Firebase services only if app was successfully initialized
  // @ts-ignore
  if (app) {
    auth = getAuth(app);
    storage = getStorage(app);
    db = getFirestore(app);
  } else {
    console.error("Firebase app was not initialized. Other Firebase services (Auth, Storage, Firestore) will not be available.");
    // @ts-ignore
    auth = null; // or some dummy object to prevent further errors if imported elsewhere
    // @ts-ignore
    storage = null;
    // @ts-ignore
    db = null;
  }
}

// @ts-ignore
export { app, auth, storage, db };
