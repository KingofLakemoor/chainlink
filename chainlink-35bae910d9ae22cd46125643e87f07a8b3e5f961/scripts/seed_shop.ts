import "dotenv/config";
import { adminDb } from '../src/lib/firebase-admin.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to deeply compare two objects for changes
function hasChanges(newData: any, dbData: any): boolean {
  for (const key in newData) {
    // We don't care about comparing timestamps when checking for actual data changes
    if (key === 'createdAt' || key === 'updatedAt') continue;

    // Simple deep comparison (handles primitives, arrays, and plain objects well enough for this schema)
    if (JSON.stringify(newData[key]) !== JSON.stringify(dbData[key])) {
      return true;
    }
  }
  return false;
}

async function seed() {
  if (!adminDb) {
    console.error("Admin DB not initialized. Please ensure GOOGLE_APPLICATION_CREDENTIALS is set, or run this script in an environment with Application Default Credentials (e.g. Cloud Run or a logged-in dev environment).");
    process.exit(1);
  }

  // Parse command line arguments
  const args = process.argv.slice(2);
  const isNewOnly = args.includes('--new-only');
  const isChangedOnly = args.includes('--changed-only');
  const isForce = args.includes('--force');

  const catalogPath = path.resolve(__dirname, '../shop_items.json');
  const items = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (const item of items) {
    const { id, ...data } = item;
    const docRef = adminDb.collection("shopItems").doc(id);
    const doc = await docRef.get();

    const timestamp = Date.now();

    if (doc.exists) {
      if (isNewOnly) {
        console.log(`Skipped existing shop item: ${item.name} (${id}) [--new-only]`);
        skippedCount++;
        continue;
      }

      const dbData = doc.data() || {};

      // Unless --force is passed, preserve mutable properties managed in the admin dashboard
      let itemData: any = {
          ...data,
          createdAt: dbData.createdAt || timestamp,
          updatedAt: timestamp
      };

      if (!isForce) {
        if (dbData.active !== undefined) itemData.active = dbData.active;
        if (dbData.forSale !== undefined) itemData.forSale = dbData.forSale;
        if (dbData.featured !== undefined) itemData.featured = dbData.featured;
        if (dbData.premiumOnly !== undefined) itemData.premiumOnly = dbData.premiumOnly;

        if (itemData.active === undefined) delete itemData.active;
        if (itemData.forSale === undefined) delete itemData.forSale;
        if (itemData.featured === undefined) delete itemData.featured;
        if (itemData.premiumOnly === undefined) delete itemData.premiumOnly;
      }

      if (isChangedOnly && !hasChanges(itemData, dbData)) {
        console.log(`Skipped unchanged shop item: ${item.name} (${id}) [--changed-only]`);
        skippedCount++;
        continue;
      }

      await docRef.update(itemData);
      console.log(`Updated shop item: ${item.name} (${id})`);
      updatedCount++;
    } else {
      const itemData = {
          ...data,
          createdAt: timestamp,
          updatedAt: timestamp
      };

      await docRef.set(itemData);
      console.log(`Created shop item: ${item.name} (${id})`);
      createdCount++;
    }
  }

  console.log(`\nSeed Complete!`);
  console.log(`Created: ${createdCount}`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped: ${skippedCount}`);
}

seed();
