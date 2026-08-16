const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const app = initializeApp();
const db = getFirestore(app);

async function main() {
    const snaps = await db.collection('matchups').where('metadata.isPropMatchup', '==', true).get();
    for (const doc of snaps.docs) {
        const data = doc.data();
        console.log(`Prop ID: ${doc.id}`);
        console.log(`  metadata.optionA.gameId:`, data.metadata?.optionA?.gameId, '(', typeof data.metadata?.optionA?.gameId, ')');
    }
}
main().catch(console.error);
