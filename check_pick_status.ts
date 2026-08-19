import { adminDb } from './src/lib/firebase-admin.js';

async function run() {
    const ids = ['VSkYRk2C8AcVezUZ3MMf0QP1a1n1_401889761', 'oAehm3hCCqRaimY14fQ0B7yuzYP2_401889761', 'VSkYRk2C8AcVezUZ3MMf0QP1a1n1_401889775'];
    for (const id of ids) {
        const d = await adminDb.collection('picks').doc(id).get();
        if (d.exists) {
            console.log(`Pick ID: ${id}, Status: ${d.data().status}`);
        }
    }
}
run().catch(console.error).finally(() => process.exit(0));
