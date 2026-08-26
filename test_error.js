const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, getApps, cert } = require('firebase-admin/app');
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  if (serviceAccount.project_id) { initializeApp({ credential: cert(serviceAccount) }); } else { initializeApp(); }
}
const db = getFirestore();
async function run() {
  await db.collection('system_errors').add({
     context: 'Test Error',
     message: 'Test message',
     timestamp: new Date()
  });
  console.log("Success");
}
run();
