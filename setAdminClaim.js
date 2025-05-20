// setAdminClaim.js
const admin = require('firebase-admin');
// IMPORTANT: Replace with the actual path to your service account key JSON file
const serviceAccount = firebase.json; // Or whatever you named it

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Replace with the UID of the user you want to make an admin
const uid = 'J39k6AGaAqZz4LERS4466985bPB2'; 

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Successfully set admin claim for user: ${uid}`);
    return admin.auth().getUser(uid);
  })
  .then((userRecord) => {
    console.log('User claims:', userRecord.customClaims);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error setting custom claims:', error);
    process.exit(1);
  });
