// setAdminClaim.js
const admin = require('firebase-admin');

// 1. IMPORTANT: Save your service account JSON content (currently in firebase.json) 
//    into a NEW file in this same root directory. For example, name it 'findachef-service-account-key.json'.
// 2. !! VERY IMPORTANT: Add the name of that new JSON file (e.g., 'findachef-service-account-key.json') to your .gitignore file !!
// 3. Update the path below to point to your new service account key file.
const serviceAccount = require('./findachef-service-account-key.json'); // MAKE SURE THIS FILENAME MATCHES YOURS

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 4. IMPORTANT: Replace 'USER_UID_OF_JEZZA5152@GMAIL.COM' 
//    with the actual Firebase UID for the user 'jezza5152@gmail.com'.
//    You can find the UID in your Firebase Console > Authentication > Users tab.
const uid = 'USER_UID_OF_JEZZA5152@GMAIL.COM'; 

admin.auth().setCustomUserClaims(uid, { admin: true })
  .then(() => {
    console.log(`Successfully set admin claim for user: ${uid}`);
    // To verify, get the user and check their custom claims
    return admin.auth().getUser(uid);
  })
  .then((userRecord) => {
    console.log('User claims:', userRecord.customClaims);
    process.exit(0); // Exit successfully
  })
  .catch((error) => {
    console.error('Error setting custom claims:', error);
    process.exit(1); // Exit with an error code
  });
