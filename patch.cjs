const fs = require('fs');
let content = fs.readFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', 'utf8');

const oldStr = `        const chainsMap = new Map();
        
        const items = shopItemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));`;

const newStr = `        const chainsMap = new Map();
        if (chainsRes.ok) {
            const chainsList = await chainsRes.json();
            chainsList.forEach((c) => {
                chainsMap.set(c.id, c);
            });
        }
        
        const items = shopItemsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));`;

content = content.replace(oldStr, newStr);
fs.writeFileSync('src/pages/leaderboards/LeaderboardsPage.tsx', content);
