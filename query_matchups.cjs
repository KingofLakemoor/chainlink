const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
async function run() {
  const snap = await db.collection('pickemMatchups').get();
  console.log("Total matchups in DB:", snap.size);
}
run();
