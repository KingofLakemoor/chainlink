const fs = require('fs');

function fixFetch(file) {
  let code = fs.readFileSync(file, 'utf-8');
  
  const fetchInventoryStart = code.indexOf("const fetchInventory = async () => {");
  const fetchInventoryEnd = code.indexOf("fetchInventory();", fetchInventoryStart);
  
  if (fetchInventoryStart !== -1 && fetchInventoryEnd !== -1) {
    // Just replace the whole fetchInventory function with a simple one that gets all shopItems
    const newFetchInventory = `const fetchInventory = async () => {
      try {
        if (import.meta.env.DEV && (!db?.app?.options?.apiKey || db?.app?.options?.apiKey === 'MY_FIREBASE_API_KEY')) {
          const mockItems = [
            { id: 'ring_gold', name: 'Gold Ring', description: 'A fancy gold ring.', cost: 500, type: 'AVATAR_RING', active: true, image: 'border-yellow-500' },
            { id: 'banner_neon', name: 'Neon Banner', description: 'Bright profile header.', cost: 1000, type: 'PROFILE_BANNER', active: true, image: 'bg-gradient-to-r from-fuchsia-500 to-cyan-500' },
          ];
          setInventoryItems(mockItems);
          setInventoryLoading(false);
          return;
        }

        const snap = await getDocs(collection(db, 'shopItems'));
        const fetchedItems = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventoryItems(fetchedItems);
      } catch (e) {
        console.error("Error fetching inventory", e);
      } finally {
        setInventoryLoading(false);
      }
    };

    `;
    
    code = code.substring(0, fetchInventoryStart) + 
           newFetchInventory + 
           code.substring(fetchInventoryEnd);
           
    fs.writeFileSync(file, code);
    console.log("Fixed " + file);
  }
}

fixFetch('src/pages/profile/ProfilePage.tsx');
fixFetch('src/pages/dashboard/DashboardPage.tsx');
