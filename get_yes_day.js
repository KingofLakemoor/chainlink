const { getFirestore } = require('firebase-admin/firestore');
const { initializeApp, getApps, cert } = require('firebase-admin/app');

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
      console.log(d.id, data.name, data.theme?.title, "joinCode:", data.joinCode, "isArchived:", data.isArchived, "isPrivate:", data.isPrivate);
    }
  });
}
run();
