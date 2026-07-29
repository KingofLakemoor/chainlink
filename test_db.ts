import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Read service account from env or file
const serviceAccount = require('./service-account.json');

initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore();

async function run() {
  const campaigns = await db.collection('pickemCampaigns').get();
  campaigns.forEach(doc => {
    const data = doc.data();
    if (data.name.includes('MLB')) {
      console.log('Campaign:', data.name, 'gamesBeginDate:', data.gamesBeginDate);
    }
  });
}
run();
