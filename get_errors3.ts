import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  if (serviceAccount.project_id) { initializeApp({ credential: cert(serviceAccount) }); } else { initializeApp(); }
}
const db = getFirestore(config.firestoreDatabaseId); // Use the correct database!

async function run() {
  const snap = await db.collection('system_errors').orderBy('timestamp', 'desc').limit(10).get();
  snap.docs.forEach(d => console.log(d.id, "|", d.data().context, "|", d.data().message));
}
run();
