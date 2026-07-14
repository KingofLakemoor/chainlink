import "dotenv/config";
import { adminDb } from '../src/lib/firebase-admin.ts';

async function assignBanners() {
  if (!adminDb) {
    console.error("Admin DB not initialized.");
    process.exit(1);
  }

  const usernamesToUpdate = ["User115803", "cpr1staid", "chancecassady"];
  const newBannerIds = [
    "banner_gradient_red",
    "banner_gradient_blue",
    "banner_gradient_green",
    "banner_gradient_yellow",
    "banner_gradient_purple",
    "banner_gradient_silver"
  ];

  try {
    const usersSnapshot = await adminDb.collection("users").get();
    let updatedCount = 0;

    const batch = adminDb.batch();

    usersSnapshot.forEach(doc => {
      const data = doc.data();
      if (usernamesToUpdate.includes(data.username)) {
        const currentInventory = data.inventory || [];
        // Add new banners only if they are not already in the inventory
        const updatedInventory = [...new Set([...currentInventory, ...newBannerIds])];

        batch.update(doc.ref, { inventory: updatedInventory });
        console.log(`Prepared update for user: ${data.username} (${doc.id})`);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
      console.log(`Successfully assigned banners to ${updatedCount} users.`);
    } else {
      console.log("No matching users found to update.");
    }

  } catch (error) {
    console.error("Error assigning banners:", error);
  }
}

assignBanners();
