import "dotenv/config";
import { adminDb } from './src/lib/firebase-admin.ts';

async function check() {
  const shopItems = ['merch_level_one_tee', 'merch_trucker_hat', 'banner_fourth_of_july_hero'];
  for (const id of shopItems) {
    const doc = await adminDb.collection("shopItems").doc(id).get();
    console.log(id, doc.data()?.image, doc.data()?.preview, doc.data()?.thumbnail);
  }
}
check().then(() => process.exit(0)).catch(console.error);
