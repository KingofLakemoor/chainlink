import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
const serviceAccount = JSON.parse(fs.readFileSync('/app/applet/firebase-service-account.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
async function run() {
  const c = await db.collection('pickemCampaigns').get();
  console.log('Total campaigns:', c.size);
  c.forEach(doc => {
    const data = doc.data();
    console.log(doc.id, 'isPrivate:', data.isPrivate, 'isArchived:', data.isArchived, 'name:', data.name);
  });
}
run();
