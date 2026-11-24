import "dotenv/config";
import { adminDb } from '../src/lib/firebase-admin.ts';

/**
 * Script to award "The Turkey Day Gobbler" profile banner to a user or campaign winner.
 * Usage:
 *   npx tsx scripts/award_turkey_banner.ts <username_or_uid>
 */
async function awardTurkeyBanner() {
  if (!adminDb) {
    console.error("Admin DB not initialized.");
    process.exit(1);
  }

  const targetIdentifier = process.argv[2];
  if (!targetIdentifier) {
    console.log("Usage: npx tsx scripts/award_turkey_banner.ts <username_or_uid>");
    console.log("Example: npx tsx scripts/award_turkey_banner.ts User115803");
    process.exit(0);
  }

  const BANNER_ID = "banner_turkey_gobbler";

  try {
    let userDoc: any = null;

    // First attempt to fetch by doc ID (UID)
    const directDoc = await adminDb.collection("users").doc(targetIdentifier).get();
    if (directDoc.exists) {
      userDoc = directDoc;
    } else {
      // Query by username or usernameLower
      const snap = await adminDb.collection("users")
        .where("usernameLower", "==", targetIdentifier.toLowerCase())
        .limit(1)
        .get();

      if (!snap.empty) {
        userDoc = snap.docs[0];
      } else {
        const snapExact = await adminDb.collection("users")
          .where("username", "==", targetIdentifier)
          .limit(1)
          .get();
        if (!snapExact.empty) {
          userDoc = snapExact.docs[0];
        }
      }
    }

    if (!userDoc || !userDoc.exists) {
      console.error(`User "${targetIdentifier}" not found.`);
      process.exit(1);
    }

    const userData = userDoc.data();
    const inventory: string[] = userData.inventory || [];

    if (inventory.includes(BANNER_ID)) {
      console.log(`User ${userData.username || targetIdentifier} (${userDoc.id}) already owns "${BANNER_ID}".`);
    } else {
      const updatedInventory = [...inventory, BANNER_ID];
      await userDoc.ref.update({
        inventory: updatedInventory,
        updatedAt: Date.now()
      });
      console.log(`Successfully awarded "${BANNER_ID}" to ${userData.username || targetIdentifier} (${userDoc.id})!`);
    }

    // Also send an in-app notification
    const notificationRef = adminDb.collection("notifications").doc();
    await notificationRef.set({
      title: "🦃 Turkey Day Gobbler Champion Award!",
      body: "Congratulations! You have been awarded the exclusive 1st Annual Turkey Day Gobbler Pick 'Em Profile Banner!",
      audience: "USER",
      targetUserId: userDoc.id,
      status: "PENDING",
      scheduledTime: Date.now(),
      createdAt: Date.now()
    });
    console.log("Created champion notification for user.");

  } catch (error) {
    console.error("Error awarding Turkey Gobbler banner:", error);
    process.exit(1);
  }
}

awardTurkeyBanner();
