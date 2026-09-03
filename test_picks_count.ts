import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
const serviceAccount = JSON.parse(fs.readFileSync('/app/applet/firebase-service-account.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
async function run() {
  const p = await db.collection('picks').where('status','==','PENDING').count().get();
  const pp = await db.collection('pickemPicks').where('status','==','PENDING').count().get();
  console.log('Picks:', p.data().count, 'Pickem:', pp.data().count);
}
run();
