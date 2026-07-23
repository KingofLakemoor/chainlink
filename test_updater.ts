import { adminDb } from './src/lib/firebase-admin.js';
import { updateAllProps } from './src/services/propGrader.js';
updateAllProps().then(() => process.exit(0)).catch(console.error);
