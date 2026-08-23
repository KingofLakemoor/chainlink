import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/brackets/BracketEntriesAdminPage.tsx', 'utf8');

const oldImports = `import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';`;
const newImports = `import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';`;

const oldQuery = `        const pQuery = query(collection(db, 'bracketGamePredictions'), where('bracketId', '==', id));
        const pSnap = await getDocs(pQuery);
        
        const userPromises = pSnap.docs.map(async (d) => {
          const data = d.data();
          const uid = data.userId || d.id.split('_')[1];
          let userName = 'Unknown';
          let userAvatar = '/logo.png';
          try {
             const uDoc = await getDoc(doc(db, 'users', uid));
             if (uDoc.exists()) {
               userName = uDoc.data().name || 'Unknown';
               if (uDoc.data().image) userAvatar = uDoc.data().image;
             }
          } catch (e) {}
          
          return {
            id: d.id,
            userId: uid,
            userName,
            userAvatar,
            paid: data.paid,
            updatedAt: data.updatedAt,
            selections: data.selections || {}
          };
        });
        const loadedEntries = await Promise.all(userPromises);`;

const newQuery = `        // Bounded to 100 entries to prevent O(N) database scaling and N+1 query locks
        const pQuery = query(collection(db, 'bracketGamePredictions'), where('bracketId', '==', id), limit(100));
        const pSnap = await getDocs(pQuery);
        
        const uidsToFetch = Array.from(new Set(pSnap.docs.map(d => {
            const data = d.data();
            return data.userId || d.id.split('_')[1];
        }).filter(Boolean)));
        
        const userMap = new Map();
        if (uidsToFetch.length > 0) {
            const chunks = [];
            for (let i = 0; i < uidsToFetch.length; i += 30) {
                chunks.push(uidsToFetch.slice(i, i + 30));
            }
            for (const chunk of chunks) {
                const uq = query(collection(db, 'users'), where('__name__', 'in', chunk));
                const uSnap = await getDocs(uq);
                uSnap.docs.forEach(d => userMap.set(d.id, d.data()));
            }
        }
        
        const loadedEntries = pSnap.docs.map(d => {
          const data = d.data();
          const uid = data.userId || d.id.split('_')[1];
          const uData = userMap.get(uid);
          
          let userName = uData?.name || uData?.username || 'Unknown';
          let userAvatar = uData?.image || '/logo.png';
          
          return {
            id: d.id,
            userId: uid,
            userName,
            userAvatar,
            paid: data.paid,
            updatedAt: data.updatedAt,
            selections: data.selections || {}
          };
        });`;

if (content.includes("where('bracketId', '==', id)")) {
    content = content.replace(oldImports, newImports);
    content = content.replace(oldQuery, newQuery);
    
    // Add disclaimer banner for the limit
    content = content.replace(
        `<h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
          <Trophy className="w-6 h-6 text-yellow-500" />
          {bracket.name} Entries ({entries.length})
        </h1>`,
        `<div className="flex flex-col">
          <h1 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Trophy className="w-6 h-6 text-yellow-500" />
            {bracket.name} Entries ({entries.length})
          </h1>
          <span className="text-xs text-yellow-500 mt-1 bg-yellow-500/10 px-2 py-1 rounded w-max border border-yellow-500/20">
            Limited to 100 recent entries to save costs and prevent N+1 queries.
          </span>
        </div>`
    );
    
    fs.writeFileSync('src/pages/admin/brackets/BracketEntriesAdminPage.tsx', content);
    console.log("Patched BracketEntriesAdminPage.tsx");
} else {
    console.log("Not found.");
}
