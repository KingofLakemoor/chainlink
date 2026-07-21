import "dotenv/config";
import { adminDb } from './src/lib/firebase-admin.ts';

async function check() {
  const shopItems = ['banner_zero_zero_zero', 'banner_inferno_protocol'];
  for (const id of shopItems) {
    const doc = await adminDb.collection("shopItems").doc(id).get();
    console.log(id, doc.data());
  }
}
check().then(() => process.exit(0)).catch(console.error);
