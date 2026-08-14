import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const snap = await adminDb.collection('matchups').where('league', '==', 'LLWS').get();
    console.log(`Found ${snap.size} LLWS matchups.`);
    snap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`${data.league} | ${data.title || ''} | ${data.homeTeam?.name} vs ${data.awayTeam?.name} | status: ${data.status} | active: ${data.active} | abandoned: ${data.abandoned}`);
    });
    process.exit(0);
}
run();
