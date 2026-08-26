import { getFirestore } from 'firebase-admin/firestore';
import { initializeApp, getApps, cert } from 'firebase-admin/app';

if (getApps().length === 0) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  if (serviceAccount.project_id) {
    initializeApp({ credential: cert(serviceAccount) });
  } else {
    initializeApp();
  }
}
const db = getFirestore();
async function run() {
  const snap = await db.collection('pickemCampaigns').get();
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.name?.toLowerCase().includes('yes') || data.theme?.title?.toLowerCase().includes('yes') || (data.joinCode && data.joinCode.toLowerCase().includes('yes'))) {
      console.log(d.id, " | name:", data.name, " | theme:", data.theme?.title, " | joinCode:", data.joinCode, " | isArchived:", data.isArchived, " | isPrivate:", data.isPrivate);
    }
  });
}
run();
