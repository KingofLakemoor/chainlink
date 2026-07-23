const admin = require('firebase-admin');
const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let serviceAccount = JSON.parse(serviceAccountStr.startsWith('{') ? serviceAccountStr : Buffer.from(serviceAccountStr, 'base64').toString());
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();
async function run() {
  const snap = await db.collection('matchups').where('type', '==', 'STATS').get();
  console.log(snap.docs.map(d => ({id: d.id, status: d.data().status})));
}
run();
