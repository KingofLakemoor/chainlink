import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const oldPickem = `  useEffect(() => {
    if (!user) return;
    
    // Check for active PickEm
    const pickemUnsub = onSnapshot(collection(db, 'pickemCampaigns'), (snap) => {
       const now = Date.now();
       let active = false;
       snap.forEach(doc => {
          const c = doc.data();
          if (c.isArchived) return; // Skip archived campaigns
          const startToCheck = c.visibleDate || c.startDate;
          if (!startToCheck || !c.endDate) active = true; // Legacy
          else if (now >= startToCheck && now <= c.endDate) active = true;
       });
       setHasActivePickEm(active);
    }, () => {});

    return () => pickemUnsub();
  }, [user]);`;

const newPickem = `  useEffect(() => {
    if (!user) return;
    
    // Check for active PickEm using getDocs instead of a global websocket listener to save massive reads
    getDocs(collection(db, 'pickemCampaigns')).then((snap) => {
       const now = Date.now();
       let active = false;
       snap.forEach(doc => {
          const c = doc.data();
          if (c.isArchived) return; // Skip archived campaigns
          const startToCheck = c.visibleDate || c.startDate;
          if (!startToCheck || !c.endDate) active = true; // Legacy
          else if (now >= startToCheck && now <= c.endDate) active = true;
       });
       setHasActivePickEm(active);
    }).catch(() => {});
  }, [user]);`;

const oldLink4 = `  useEffect(() => {
    if (!user) return;
    
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const q = query(collection(db, 'link4Segments'), where('endTime', '>', twelveHoursAgo));
    
    const link4Unsub = onSnapshot(q, (snap) => {
        let active = false;
        snap.forEach(doc => {
            const seg = doc.data();
            if (seg.startTime && new Date(seg.startTime) <= new Date()) {
                active = true;
            }
        });
        setHasActiveLink4(active);
    }, () => {});
    
    return () => link4Unsub();
  }, [user]);`;

const newLink4 = `  useEffect(() => {
    if (!user) return;
    
    const now = new Date();
    const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString();
    const q = query(collection(db, 'link4Segments'), where('endTime', '>', twelveHoursAgo));
    
    // Use getDocs instead of a global websocket listener to save resources
    getDocs(q).then((snap) => {
        let active = false;
        snap.forEach(doc => {
            const seg = doc.data();
            if (seg.startTime && new Date(seg.startTime) <= new Date()) {
                active = true;
            }
        });
        setHasActiveLink4(active);
    }).catch(() => {});
  }, [user]);`;

if (content.includes("pickemUnsub")) {
    content = content.replace(oldPickem, newPickem);
    content = content.replace(oldLink4, newLink4);
    
    if (!content.includes("getDocs")) {
        content = content.replace(
            "import { collection, query, where, onSnapshot } from 'firebase/firestore';",
            "import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';"
        );
    }
    
    fs.writeFileSync('src/App.tsx', content);
    console.log("Patched App.tsx");
} else {
    console.log("Could not find the target block in App.tsx.");
}
