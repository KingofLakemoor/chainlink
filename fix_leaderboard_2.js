import fs from 'fs';

let content = fs.readFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', 'utf8');

content = content.replace(
`        const [usersRes, chainsRes, pendingPicksSnap, shopItemsSnap] = await Promise.all([
           fetch('/api/users/public', {
              headers: { 'Authorization': \`Bearer \${token}\` }
           }),
           fetch('/api/chains', {
              headers: { 'Authorization': \`Bearer \${token}\` }
           }),
           getDocs(query(collection(db, 'picks'), where('status', '==', 'PENDING'))),
           getDocs(collection(db, 'shopItems'))
        ]);`,
`        const [usersRes, chainsRes, shopItemsSnap] = await Promise.all([
           fetch('/api/users/public', {
              headers: { 'Authorization': \`Bearer \${token}\` }
           }),
           fetch('/api/chains', {
              headers: { 'Authorization': \`Bearer \${token}\` }
           }),
           getDocs(collection(db, 'shopItems'))
        ]);`);

content = content.replace(
`        const usersData = await usersRes.json();
        const usersList = usersData.users || [];

        const userPicksMap = new Map<string, any[]>();`,
`        const usersData = await usersRes.json();
        const usersList = usersData.users || [];
        
        const topUserIds = usersList.map((u: any) => u.id);
        const pendingPicks: any[] = [];
        if (topUserIds.length > 0) {
            const chunkArray = (arr: any[], size: number) => arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
            const userChunks = chunkArray(topUserIds, 30);
            for (const chunk of userChunks) {
                const pickSnap = await getDocs(query(collection(db, 'picks'), where('userId', 'in', chunk), where('status', '==', 'PENDING')));
                pickSnap.docs.forEach(d => pendingPicks.push(d.data()));
            }
        }

        const userPicksMap = new Map<string, any[]>();`);


fs.writeFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', content);
console.log("Patched correctly");

