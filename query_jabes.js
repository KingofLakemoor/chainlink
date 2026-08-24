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
  const usersRef = db.collection('users');
  const snap = await usersRef.where('usernameLower', '==', 'j_abes').get();
  if (snap.empty) {
    console.log("User j_abes not found");
    return;
  }
  const user = snap.docs[0];
  console.log("Found user:", user.id, user.data().username);

  const picksSnap = await db.collection('picks')
    .where('userId', '==', user.id)
    .where('status', '==', 'PENDING')
    .get();

  console.log(`Found ${picksSnap.size} pending picks for ${user.data().username}`);

  for (const pickDoc of picksSnap.docs) {
    const pick = pickDoc.data();
    console.log(`\nPick ID: ${pickDoc.id}`);
    console.log(`Matchup ID: ${pick.matchupId}`);
    console.log(`Selected: ${pick.pick} (Active: ${pick.active})`);

    const matchupDoc = await db.collection('matchups').doc(pick.matchupId).get();
    if (matchupDoc.exists) {
      const matchup = matchupDoc.data();
      console.log(`Matchup Info: ${matchup.homeTeam.name} vs ${matchup.awayTeam.name}`);
      console.log(`Matchup active on board? ${matchup.active}`);
      console.log(`Matchup status: ${matchup.status}`);
    } else {
      console.log(`Matchup ${pick.matchupId} does NOT exist!`);
    }
  }
}
run().catch(console.error);
