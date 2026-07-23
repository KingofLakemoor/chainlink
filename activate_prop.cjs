const admin = require('firebase-admin');
const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount = JSON.parse(serviceAccountStr.startsWith('{') ? serviceAccountStr : Buffer.from(serviceAccountStr, 'base64').toString());
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function run() {
  await db.collection('leagueSettings').doc('PROP').set({ active: true, updatedAt: Date.now() }, { merge: true });
  await db.collection('leagueSettings').doc('SCRIPTLESS').set({ active: true, updatedAt: Date.now() }, { merge: true });
  console.log("Activated PROP and SCRIPTLESS leagues");
}
run();
