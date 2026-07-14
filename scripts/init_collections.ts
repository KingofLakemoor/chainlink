import { adminDb } from '../src/lib/firebase-admin.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Use basic __dirname replacement for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createCollections() {
  if (!adminDb) {
    console.error("Admin DB not initialized. Please ensure GOOGLE_APPLICATION_CREDENTIALS is set, or run this script in an environment with Application Default Credentials (e.g. Cloud Run or a logged-in dev environment).");
    process.exit(1);
  }

  const blueprintPath = path.resolve(__dirname, '../firebase-blueprint.json');
  const bp = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'));
  const entities = bp.entities;

  let successCount = 0;
  let failCount = 0;

  for (const entityName of Object.keys(entities)) {
    // Generate collection name from entity name
    let collectionName = entityName.charAt(0).toLowerCase() + entityName.slice(1) + 's';

    // Custom overrides based on firestore.rules
    if (entityName === 'GlobalQuiz') collectionName = 'globalQuiz';
    if (entityName === 'PickQueue') collectionName = 'pickQueues';

    console.log(`Ensuring collection ${collectionName} exists with a dummy _init doc...`);
    try {
       const docRef = adminDb.collection(collectionName).doc('_init');
       await docRef.set({ _initialized: true, _createdAt: Date.now() }, { merge: true });
       console.log(` -> Created/Verified ${collectionName}`);
       successCount++;
    } catch (e) {
       console.error(` -> Error creating ${collectionName}:`, e);
       failCount++;
    }
  }

  console.log(`\nDone. Successfully checked ${successCount} collections. Failed: ${failCount}.`);
}

createCollections();
