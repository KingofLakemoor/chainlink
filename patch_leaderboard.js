import fs from 'fs';

let content = fs.readFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', 'utf8');

const oldFetchBlock = `        const [usersRes, chainsRes, pendingPicksSnap, shopItemsSnap] = await Promise.all([
           fetch('/api/users/leaderboard', {
              headers: { 'Authorization': \`Bearer \${token}\` }
           }),
           fetch('/api/chains', {
              headers: { 'Authorization': \`Bearer \${token}\` }
           }),
           getDocs(query(collection(db, 'picks'), where('status', '==', 'PENDING'))),
           getDocs(collection(db, 'shopItems'))
        ]);

        if (!usersRes.ok) throw new Error("Failed to fetch leaderboard data");

        const usersData = await usersRes.json();
        const usersList = usersData.users || [];`;

const newFetchBlock = `        const [usersRes, chainsRes, shopItemsSnap] = await Promise.all([
           fetch('/api/users/leaderboard', {
              headers: { 'Authorization': \`Bearer \${token}\` }
           }),
           fetch('/api/chains', {
              headers: { 'Authorization': \`Bearer \${token}\` }
           }),
           getDocs(collection(db, 'shopItems'))
        ]);

        if (!usersRes.ok) throw new Error("Failed to fetch leaderboard data");

        const usersData = await usersRes.json();
        const usersList = usersData.users || [];
        
        // Fetch pending picks only for the top users on the leaderboard to avoid unbounded global reads
        const topUserIds = usersList.map((u: any) => u.id);
        const pendingPicks: any[] = [];
        if (topUserIds.length > 0) {
            const chunkArray = (arr: any[], size: number) => arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
            const userChunks = chunkArray(topUserIds, 30);
            for (const chunk of userChunks) {
                const pickSnap = await getDocs(query(collection(db, 'picks'), where('userId', 'in', chunk), where('status', '==', 'PENDING')));
                pickSnap.docs.forEach(d => pendingPicks.push(d.data()));
            }
        }`;

const oldMappingBlock = `        const userPicksMap = new Map<string, any[]>();
        const pendingMatchupIds = new Set<string>();

        pendingPicksSnap.docs.forEach(doc => {
            const pick = doc.data() as any;`;

const newMappingBlock = `        const userPicksMap = new Map<string, any[]>();
        const pendingMatchupIds = new Set<string>();

        pendingPicks.forEach(pick => {`;

if (content.includes("pendingPicksSnap.docs.forEach(")) {
    content = content.replace(oldFetchBlock, newFetchBlock);
    content = content.replace(oldMappingBlock, newMappingBlock);
    
    // Ensure documentId is imported if needed, but we used userId so it's fine.
    
    fs.writeFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', content);
    console.log("Patched LeaderboardsPage.tsx");
} else {
    console.log("Could not find the target block in LeaderboardsPage.");
}
