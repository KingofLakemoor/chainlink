import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
  if (!adminDb) return;
  const campaignsSnap = await adminDb.collection('pickemCampaigns').where('archived', '!=', true).get();
  campaignsSnap.docs.forEach(doc => {
      const c = doc.data();
      console.log(c.id, c.league, c.leagues);
  });
  const activeLeaguesSnap = await adminDb.collection('leagueSettings').where('active', '==', true).get();
  console.log("League settings active:", activeLeaguesSnap.docs.map(doc => doc.id));
}
run();
