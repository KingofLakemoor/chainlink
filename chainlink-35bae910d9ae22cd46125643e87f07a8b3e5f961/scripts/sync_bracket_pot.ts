import { adminDb } from '../src/lib/firebase-admin.ts';

async function syncBracketPot() {
  const bracketId = 'world-cup-2026';
  const bracketRef = adminDb!.collection('brackets').doc(bracketId);

  try {
    await adminDb!.runTransaction(async (transaction) => {
      const bracketDoc = await transaction.get(bracketRef);

      if (!bracketDoc.exists) {
        console.error(`Bracket with ID ${bracketId} does not exist.`);
        return;
      }

      const bracketData = bracketDoc.data()!;
      const cost = bracketData.cost ?? 10; // Default cost to 10 if not explicitly set

      // Get all paid predictions for this bracket
      const predictionsQuery = adminDb!.collection('bracketGamePredictions')
        .where('bracketId', '==', bracketId)
        .where('paid', '==', true);

      const predictionsSnap = await predictionsQuery.get();
      const numEntries = predictionsSnap.size;

      const calculatedPot = numEntries * cost;

      console.log(`Found ${numEntries} paid entries for bracket ${bracketId}.`);
      console.log(`Current totalPot: ${bracketData.totalPot}. Calculated totalPot: ${calculatedPot}.`);

      if (bracketData.totalPot !== calculatedPot) {
        transaction.update(bracketRef, { totalPot: calculatedPot });
        console.log(`Updated totalPot to ${calculatedPot}.`);
      } else {
        console.log(`totalPot is already correct. No update needed.`);
      }
    });
    console.log("Bracket pot sync complete.");
  } catch (error) {
    console.error("Error syncing bracket pot:", error);
  }
}

syncBracketPot();
