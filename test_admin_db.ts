import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf-8'));

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  if (serviceAccount.project_id) { initializeApp({ credential: cert(serviceAccount) }); } else { initializeApp(); }
}
const dbDefault = getFirestore(); 
const dbNamed = getFirestore(undefined, config.firestoreDatabaseId); 

async function run() {
  const snap1 = await dbDefault.collection('link4Matchups').where('segmentId', '==', 'segment_1787759902919').get();
  console.log("Default DB Count:", snap1.docs.length);

  const snap2 = await dbNamed.collection('link4Matchups').where('segmentId', '==', 'segment_1787759902919').get();
  console.log("Named DB Count:", snap2.docs.length);
}
run();
