import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    await adminDb.collection('leagueSettings').doc('LLWS').set({ active: true }, { merge: true });
    console.log("Enabled LLWS in leagueSettings");
}
run().catch(console.error).finally(() => process.exit(0));
