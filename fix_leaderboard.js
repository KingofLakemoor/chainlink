import fs from 'fs';

let content = fs.readFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', 'utf8');

const oldFetchBlock = `        const [usersRes, chainsRes, pendingPicksSnap, shopItemsSnap] = await Promise.all([
           fetch('/api/users/public', {
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
           fetch('/api/users/public', {
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

content = content.replace(oldFetchBlock, newFetchBlock);

fs.writeFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', content);
console.log("Patched LeaderboardsPage.tsx again");

