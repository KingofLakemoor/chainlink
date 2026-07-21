import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  projectId: "gen-lang-client-0142543934",
});

const db = getFirestore(app);
db.settings({ databaseId: 'ai-studio-1613b77c-1870-426f-a112-896d5efd5f69' });

async function run() {
  await db.collection('shop_items').doc('ring_bull_bear').set({
    id: 'ring_bull_bear',
    name: 'Bull & Bear',
    description: 'A market ring showing bullish and bearish forces.',
    cost: 3500,
    type: 'AVATAR_RING',
    active: true,
    forSale: true,
    image: 'BullBearAvatarRing',
    featured: true,
    preview: 'BullBearAvatarRing',
    order: 16,
    collectionId: 'signal_floor'
  }, { merge: true });
  console.log("Added Bull & Bear ring to shop");
}
run();
