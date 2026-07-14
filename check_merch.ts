import "dotenv/config";
import { adminDb } from './src/lib/firebase-admin.ts';

async function check() {
  const doc = await adminDb.collection("shopItems").doc("banner_inferno_board").get();
  console.log(doc.data());
}
check().then(() => process.exit(0)).catch(console.error);
