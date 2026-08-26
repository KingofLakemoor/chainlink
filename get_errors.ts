import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  if (serviceAccount.project_id) { initializeApp({ credential: cert(serviceAccount) }); } else { initializeApp(); }
}
const db = getFirestore();
async function run() {
  const snap = await db.collection('system_errors').get();
  snap.docs.forEach(d => console.log(d.id, d.data().context, d.data().message, d.data().url));
}
run();
