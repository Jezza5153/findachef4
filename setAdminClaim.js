// setAdminClaim.js
const admin = require('firebase-admin');

const serviceAccount = require('./findachef2-firebase-adminsdk-fbsvc-93293aeb34.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log("Firebase Admin SDK initialized successfully.");
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    console.log("Firebase Admin SDK already initialized.");
  } else {
    console.error("Error initializing Firebase Admin SDK:", error);
    process.exit(1);
  }
}

const uid = 'J39k6AGaAqZz4LERS4466985bPB2';

console.log(`Attempting to set isAdmin claim for UID: ${uid}`);

admin.auth().setCustomUserClaims(uid, { isAdmin: true }) // ✅ Corrected
  .then(() => {
    console.log(`Successfully set isAdmin claim for user: ${uid}`);
    return admin.auth().getUser(uid);
  })
  .then((userRecord) => {
    console.log('User claims for UID', uid, ':', userRecord.customClaims);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`Error setting custom claims for UID ${uid}:`, error.message);
    if (error.code === 'auth/user-not-found') {
      console.error(`CRITICAL: The user with UID ${uid} was not found in Firebase Authentication for the project targeted by your service account key.`);
    }
    process.exit(1);
  });
