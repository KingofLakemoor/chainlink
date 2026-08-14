import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const snap = await adminDb.collection('pickemMatchups').get();
    let hasATP = false;
    snap.docs.forEach(doc => {
        const gameId = doc.data().gameId;
        if (gameId && gameId.toString().startsWith('421-')) {
            console.log("ATP game in pickem:", gameId);
            hasATP = true;
        }
    });
    if (!hasATP) console.log("No ATP games in pickem.");
    process.exit(0);
}
run();
