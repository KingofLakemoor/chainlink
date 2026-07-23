import { adminDb } from './src/lib/firebase-admin.js';
import { updateAllProps } from './src/services/propGrader.js';
async function run() {
    await updateAllProps();
}
run();
