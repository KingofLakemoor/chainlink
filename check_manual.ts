import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    console.log("Checking all matchups for LLWS (numeric vs non-numeric)");
    const mSnap = await adminDb.collection('matchups').where('league', '==', 'LLWS').get();
    mSnap.docs.forEach(d => {
        console.log(`Matchup ID: ${d.id}, GameID: ${d.data().gameId}, Title: ${d.data().title}, Status: ${d.data().status}`);
    });
    
    console.log("Checking all pickem matchups for LLWS");
    const pmSnap = await adminDb.collection('pickemMatchups').where('league', '==', 'LLWS').get();
    pmSnap.docs.forEach(d => {
         console.log(`Pickem Matchup ID: ${d.id}, GameID: ${d.data().gameId}, Title: ${d.data().title}, Status: ${d.data().status}`);
    });
}
run().catch(console.error).finally(() => process.exit(0));
