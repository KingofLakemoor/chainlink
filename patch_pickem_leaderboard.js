import fs from 'fs';
let content = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

const oldLeaderboard = `      try {
        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('campaignId', '==', selectedCampaign.id)
        );
        const pSnap = await getDocs(pQuery);`;

const newLeaderboard = `      try {
        // Limited to recent picks to prevent O(N) client-side memory lockups
        const pQuery = query(
          collection(db, 'pickemPicks'),
          where('campaignId', '==', selectedCampaign.id),
          limit(3000)
        );
        const pSnap = await getDocs(pQuery);`;

if (content.includes("where('campaignId', '==', selectedCampaign.id)")) {
    content = content.replace(oldLeaderboard, newLeaderboard);
    
    if (!content.includes("limit(3000)")) {
        content = content.replace(
            "import { collection, getDocs, doc, query, where, setDoc, getDoc, deleteDoc, documentId } from 'firebase/firestore';",
            "import { collection, getDocs, doc, query, where, setDoc, getDoc, deleteDoc, documentId, limit, orderBy } from 'firebase/firestore';"
        );
    }
    
    // add disclaimer to the UI
    const disclaimerTarget = `<div className="mt-8 flex justify-between items-center bg-[#18181A] px-4 py-3 rounded-lg border border-zinc-800">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Leaderboard</h2>`;
    const newDisclaimer = `<div className="mt-8 flex flex-col justify-between items-start bg-[#18181A] px-4 py-3 rounded-lg border border-zinc-800">
                  <div className="w-full flex justify-between items-center mb-1">
                     <h2 className="text-xl font-bold text-white flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-400" /> Leaderboard</h2>
                  </div>
                  <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/20">
                     Leaderboard computed from a bounded subset of 3,000 recent picks.
                  </span>`;
    
    content = content.replace(disclaimerTarget, newDisclaimer);

    fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', content);
    console.log("Patched PickEmPage.tsx");
} else {
    console.log("Not found.");
}
