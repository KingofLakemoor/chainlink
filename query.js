import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));

initializeApp({
  projectId: serviceAccount.projectId
});

const db = getFirestore(serviceAccount.firestoreDatabaseId);

async function run() {
  const snapshot = await db.collection('shopItems').get();
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.type === 'PROFILE_BANNER' || data.type === 'AVATAR_RING') {
      console.log(data.id, data.type, data.image);
    }
  });
}
run();
