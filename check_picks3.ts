import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const userEmail = "kingoflakemoor@gmail.com";
    const userSnap = await adminDb.collection('users').where('email', '==', userEmail).get();
    const userId = userSnap.docs[0].id;

    const picksSnap = await adminDb.collection('picks').where('userId', '==', userId).get();
    picksSnap.docs.forEach(d => {
        const data = d.data();
        if (data.league === 'LLWS' || (data.pick && (data.pick.name === 'Davenport IA' || data.pick.name === 'Whitefish Bay WI' || data.pick.name === 'Tacoma WA' || data.pick.name === 'Eagle ID'))) {
            console.log(`LLWS Pick! ID: ${d.id}, MatchupID: ${data.matchupId}, Pick: ${JSON.stringify(data.pick)}, Status: ${data.status}`);
        }
    });

    // Let's also just check if there were any matchups in the database containing 'LLWS' that got deleted (we can't easily query deleted things in firestore, but maybe we can query by matchup id prefix?)
}
run().catch(console.error).finally(() => process.exit(0));
