import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  if (serviceAccount.project_id) { initializeApp({ credential: cert(serviceAccount) }); } else { initializeApp(); }
}
const db = getFirestore(); 

async function run() {
  const now = new Date();
  const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
  
  const snap = await db.collection('link4Segments')
    .where('endTime', '>', twelveHoursAgo)
    .orderBy('endTime', 'asc')
    .limit(1)
    .get();

  console.log("Count:", snap.docs.length);
  snap.docs.forEach(d => console.log(d.id, d.data().name));
}
run();
