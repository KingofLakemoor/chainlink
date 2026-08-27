import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  if (serviceAccount.project_id) { initializeApp({ credential: cert(serviceAccount) }); } else { initializeApp(); }
}
const db = getFirestore(); 

async function run() {
  const snap = await db.collection('link4Matchups').where('segmentId', '==', 'segment_1787759902919').limit(1).get();
  snap.docs.forEach(d => console.log(JSON.stringify(d.data(), null, 2)));
}
run();
