import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();
let app;
if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    app = initializeApp({ credential: cert(serviceAccount) });
} else {
    app = initializeApp();
}
const db = getFirestore();

async function run() {
  const userId = 'FfrwlXCeo0Rel50m6ax3uIVTBDf1';
  
  const picksSnap = await db.collection('picks')
    .where('userId', '==', userId)
    .get();

  const picks = picksSnap.docs.map(d => ({id: d.id, ...d.data()}));
  picks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  
  const recentPicks = picks.slice(0, 5);

  console.log(`Found ${picks.length} total picks for @j_abes. Showing 5 most recent:`);

  for (const pick of recentPicks) {
    console.log(`\nPick ID: ${pick.id}`);
    console.log(`Matchup ID: ${pick.matchupId}`);
    console.log(`Status: ${pick.status} - Selected: ${pick.pick}`);

    const matchupDoc = await db.collection('matchups').doc(pick.matchupId).get();
    if (matchupDoc.exists) {
      const matchup = matchupDoc.data();
      console.log(`Matchup Info: ${matchup.homeTeam.name} vs ${matchup.awayTeam.name}`);
      console.log(`Matchup active? ${matchup.active}, status: ${matchup.status}`);
      console.log(`Matchup startTime: ${new Date(matchup.startTime).toISOString()}`);
    } else {
      console.log(`Matchup ${pick.matchupId} does NOT exist!`);
    }
  }
}
run().catch(console.error);
