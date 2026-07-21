import "dotenv/config";
import { adminDb } from './src/lib/firebase-admin.ts';

async function updateSponsor() {
  if (!adminDb) {
    console.error("Admin DB not initialized.");
    process.exit(1);
  }

  const sponsorsRef = adminDb.collection("sponsors");
  const snapshot = await sponsorsRef.get();
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.name && data.name.toLowerCase().includes('scriptless')) {
      console.log("Updating sponsor: " + data.name);
      await doc.ref.update({
        logoUrl: "gs://chainlink-2-72590.firebasestorage.app/Sponsors/scriptless.png"
      });
      console.log('Updated logoUrl for scriptless.');
    }
  }
}

updateSponsor().then(() => process.exit(0)).catch(console.error);
