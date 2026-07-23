const admin = require('firebase-admin');
const serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
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
  const doc = await db.collection('matchups').doc('MhcHjvaf3Uj2JfYLLHr9').get();
  console.log(JSON.stringify(doc.data(), null, 2));
}
run();
