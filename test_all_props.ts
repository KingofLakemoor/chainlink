import admin from 'firebase-admin';

const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount = JSON.parse(serviceAccountStr.startsWith('{') ? serviceAccountStr : Buffer.from(serviceAccountStr, 'base64').toString());

if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
}
const db = admin.firestore();

async function run() {
  const snap = await db.collection('matchups').where('type', '==', 'STATS').get();
  for (const doc of snap.docs) {
     console.log(doc.id, doc.data().status);
  }
}
run();
