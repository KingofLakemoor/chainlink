import "dotenv/config";
import { adminDb } from './src/lib/firebase-admin.ts';

async function check() {
  const doc = await adminDb.collection("shopItems").doc("banner_zero_zero_zero").get();
  console.log("type:", typeof doc.data().thumbnail, "val:", doc.data().thumbnail);
  console.log("type img:", typeof doc.data().image, "val:", doc.data().image);
}
check().then(() => process.exit(0)).catch(console.error);
