import { adminDb } from '../src/lib/firebase-admin.ts';

async function resetBeta() {
  if (!adminDb) {
    console.error("Admin DB not initialized.");
    process.exit(1);
  }

  // Find Beta Tester title item ID
  const shopItemsSnap = await adminDb.collection('shopItems')
    .where('name', '==', 'Beta Tester')
    .limit(1)
    .get();

  let betaTesterTitleId = 'beta-tester-title';
  if (!shopItemsSnap.empty) {
    betaTesterTitleId = shopItemsSnap.docs[0].id;
    console.log("Found Beta Tester title item:", betaTesterTitleId);
  } else {
    console.log("Beta Tester title item not found. Creating it...");
    await adminDb.collection('shopItems').doc(betaTesterTitleId).set({
      name: 'Beta Tester',
      type: 'TITLE',
      cost: 0,
      description: 'Awarded to users who participated in the Beta.',
      image: '',
      preview: '',
      forSale: false,
      active: true,
      category: 'TITLE',
      sortOrder: 0
    });
  }

  // 1. Calculate how many links each user purchased by querying the `orders` collection
  const ordersSnap = await adminDb.collection('orders').get();
  const userPurchasedLinks: Record<string, number> = {};

  ordersSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data.itemId && data.itemId.startsWith('links-') && data.userId) {
       const amountStr = data.itemId.replace('links-', '');
       const amount = parseInt(amountStr, 10);
       if (!isNaN(amount)) {
          userPurchasedLinks[data.userId] = (userPurchasedLinks[data.userId] || 0) + amount;
       }
    }
  });

  // Fetch all users
  const usersSnap = await adminDb.collection('users').get();

  let userCount = 0;
  let batch = adminDb.batch();
  let operationsCount = 0;

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();

    const inventory = userData.inventory || [];

    // Add "Beta Tester" title if not already there
    if (!inventory.includes(betaTesterTitleId)) {
      inventory.push(betaTesterTitleId);
    }

    // Reset stats, achievements, links (except purchased ones)
    const purchasedLinks = userPurchasedLinks[userDoc.id] || 0;

    const updateData: any = {
      inventory: inventory,
      stats: { wins: 0, losses: 0, pushes: 0 },
      allTimeStats: { wins: 0, losses: 0, pushes: 0 },
      historicalStats: {},
      statsByLeague: {},
      allTimeBest: 0,
      achievements: [],
      records: {}, // Add records wipe if it exists
      medals: {}, // Add medals wipe if it exists
      links: purchasedLinks, // Non-purchased links reset to 0
      updatedAt: Date.now(),
    };

    batch.update(userDoc.ref, updateData);
    operationsCount++;
    userCount++;

    if (operationsCount >= 400) {
      await batch.commit();
      batch = adminDb.batch();
      operationsCount = 0;
    }
  }

  if (operationsCount > 0) {
    await batch.commit();
    batch = adminDb.batch();
    operationsCount = 0;
  }

  console.log(`Finished processing ${userCount} users.`);

  // Clear picks, chains, pickQueues, link4Picks, pickemParticipants, and bracketGamePredictions
  const collectionsToClear = ['chains', 'picks', 'pickQueues', 'pickemPicks', 'link4Picks', 'pickemParticipants', 'bracketGamePredictions'];

  for (const coll of collectionsToClear) {
    console.log(`Clearing ${coll}...`);
    const snap = await adminDb.collection(coll).get();
    for (const doc of snap.docs) {
      const data = doc.data();
      let shouldDelete = true;

      if (coll === 'picks' || coll === 'pickemPicks') {
        if (data.status === 'PENDING') {
          shouldDelete = false;
        }
      } else if (coll === 'link4Picks') {
        if (data.picks && Array.isArray(data.picks)) {
          const hasPending = data.picks.some((p: any) => p.status === 'PENDING');
          if (hasPending) {
            shouldDelete = false;
          }
        }
      }

      if (shouldDelete) {
        batch.delete(doc.ref);
        operationsCount++;
        if (operationsCount >= 400) {
          await batch.commit();
          batch = adminDb.batch();
          operationsCount = 0;
        }
      }
    }
    if (operationsCount > 0) {
      await batch.commit();
      batch = adminDb.batch();
      operationsCount = 0;
    }
  }

  console.log("All done.");
}

resetBeta();
