import fs from 'fs';
let code = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf-8');

// Patch 1: User's picks fetching fallback
const userPicksOriginal = `
        const q = query(collection(db, 'link4Picks'), where('segmentId', '==', activeSegmentId), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
`;
const userPicksPatched = `
        let pickData = null;
        try {
          const q = query(collection(db, 'link4Picks'), where('segmentId', '==', activeSegmentId), where('userId', '==', user.uid));
          const snap = await getDocs(q);
          if (!snap.empty) {
            pickData = snap.docs[0].data();
          }
        } catch (fbErr) {
          console.warn("Primary link4Picks fetch failed", fbErr);
          try {
            const res = await fetch(\`/api/link4/picks/\${activeSegmentId}\`);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.picks) {
                 const myPick = data.picks.find((p: any) => p.userId === user.uid);
                 if (myPick) pickData = myPick;
              }
            }
          } catch(apiErr) {
            console.error("API fallback failed for picks", apiErr);
          }
        }
        
        if (pickData) {
          const data = pickData;
`;
code = code.replace(userPicksOriginal, userPicksPatched);

// Patch 2: Leaderboard fetching fallback
const lbOriginal = `
        try {
            const snap = await getDocs(query(collection(db, 'link4Picks'), where('segmentId', '==', activeSegmentId)));
            
        const allUserPicks = snap.docs.map(d => d.data());
`;
const lbPatched = `
        try {
            let allUserPicks: any[] = [];
            try {
              const snap = await getDocs(query(collection(db, 'link4Picks'), where('segmentId', '==', activeSegmentId)));
              allUserPicks = snap.docs.map(d => d.data());
            } catch (fbErr) {
              console.warn("Primary link4Picks leaderboard fetch failed", fbErr);
              const res = await fetch(\`/api/link4/picks/\${activeSegmentId}\`);
              if (res.ok) {
                const data = await res.json();
                if (data.success && data.picks) {
                  allUserPicks = data.picks;
                }
              }
            }
`;
code = code.replace(lbOriginal, lbPatched);

fs.writeFileSync('src/pages/link4/Link4Page.tsx', code);
