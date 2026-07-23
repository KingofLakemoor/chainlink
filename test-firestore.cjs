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
  const users = await db.collection('users').where('email', '==', 'kingoflakemoor@gmail.com').get();
  if (users.empty) {
    console.log("User not found");
  } else {
    console.log("User role:", users.docs[0].data().role);
  }
}
run();
