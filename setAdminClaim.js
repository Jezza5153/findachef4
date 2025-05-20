// setAdminClaim.js
const admin = require('firebase-admin');

// IMPORTANT: Make sure this path points to the service account key JSON file
// for your NEW "findachef2" Firebase project.
// This file should be in your .gitignore.
const serviceAccount = require('./findachef2-firebase-adminsdk-fbsvc-93293aeb34.json'); // Updated filename

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    console.log("Firebase Admin SDK already initialized.");
    // admin.app() can be used to get the already initialized app
  } else {
    console.error("Error initializing Firebase Admin SDK:", error);
    process.exit(1);
  }
}

// THIS IS THE CORRECT UID FOR YOUR ADMIN USER
const uid = 'J39k6AGaAqZz4LERS4466985bPB2'; 

console.log(`Attempting to set admin claim for UID: ${uid}`);

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Successfully set admin claim for user: ${uid}`);
    return admin.auth().getUser(uid);
  })
  .then((userRecord) => {
    console.log('User claims for UID', uid, ':', userRecord.customClaims);
    process.exit(0); // Success
  })
  .catch((error) => {
    console.error(`Error setting custom claims for UID ${uid}:`, error.message);
    if (error.code === 'auth/user-not-found') {
      console.error(`CRITICAL: The user with UID ${uid} was not found in Firebase Authentication for the project targeted by your service account key. Ensure this user exists in "findachef2" Firebase Auth.`);
    }
    process.exit(1); // Failure
  });
