const admin = require('firebase-admin');
const fs = require('fs');

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountStr) {
  console.log("No FIREBASE_SERVICE_ACCOUNT_KEY");
  process.exit(1);
}
let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountStr);
} catch (e) {
  serviceAccount = JSON.parse(Buffer.from(serviceAccountStr, 'base64').toString());
}
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

async function run() {
  try {
    const userRef = db.collection('users').doc('vGgG8cI8xZVSk4e27p3D0C3Zk9w1'); // assuming this is the UID, let's just query it
    const users = await db.collection('users').where('email', '==', 'kingoflakemoor@gmail.com').get();
    if (users.empty) {
      console.log("User not found");
      return;
    }
    const uid = users.docs[0].id;
    console.log("Found user:", uid);
    
    // We are using the admin SDK, which bypasses all security rules!
    // So we can't test rules this way...
    console.log("Can't test rules from Admin SDK easily.");
  } catch(e) {
    console.error(e);
  }
}
run();
