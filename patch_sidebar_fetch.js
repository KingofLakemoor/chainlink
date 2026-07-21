import fs from 'fs';
let content = fs.readFileSync('src/components/SidebarProgress.tsx', 'utf8');

const targetFetch = `        setActiveUsers(uniqueUsers.size);
        setGlobalPicks(totalPicks);`;

const replacementFetch = `        setActiveUsers(uniqueUsers.size);
        setGlobalPicks(totalPicks);
        
        // 3. Fetch referrals for the target month
        const targetMonthStr = currentPrizeData.targetMonth || new Date().toISOString().slice(0, 7);
        const monthlyStatsRef = doc(db, 'settings', \`monthlyStats_\${targetMonthStr}\`);
        const statsSnap = await getDoc(monthlyStatsRef);
        if (statsSnap.exists()) {
          setGlobalReferrals(statsSnap.data().referrals || 0);
        } else {
          setGlobalReferrals(0);
        }`;

content = content.replace(targetFetch, replacementFetch);
fs.writeFileSync('src/components/SidebarProgress.tsx', content);
console.log("Patched sidebar fetch");
