import fs from 'fs';

let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

const oldBlock = `          const pickemMatchupId = \`\${id}_\${selectedWeek}_\${m.gameId}\`;
          const docRef = doc(db, 'pickemMatchups', pickemMatchupId);

          let metadataToSave = m.metadata || null;

          // For CFB and NFL, check if it's before Thursday 2AM AZ time (9AM UTC) relative to the GAME'S week
          if ((lg === 'CFB' || lg === 'NFL') && m.metadata) {
             // Find the previous Thursday at 9AM UTC relative to the game's start time
             const gameDate = new Date(m.startTime);
             const gameDay = gameDate.getUTCDay();

             // How many days since the last Thursday?
             // If gameDay is Thursday (4), and hour >= 9, it's 0 days.
             // If gameDay is Thursday (4) and hour < 9, the "last Thursday" was 7 days ago.
             // We can simplify by just getting the current timestamp and finding the MOST RECENT Thursday 9AM UTC,
             // then checking if the current time is before that.
             // Wait, the lock time is the Thursday *of the game's week*.
             // For a CFB game on Saturday, lock is that same week's Thursday.
             // Let's construct the lock date based on the game's start time:
             const lockDate = new Date(m.startTime);

             // Determine days to subtract to get to Thursday (4)
             let daysToSubtract = gameDay - 4;
             if (daysToSubtract < 0) {
                 daysToSubtract += 7; // e.g., if game is Wed (3), lock was last Thursday (subtract 6)
             }

             lockDate.setUTCDate(lockDate.getUTCDate() - daysToSubtract);
             lockDate.setUTCHours(9, 0, 0, 0); // 9 AM UTC

             const now = new Date();
             const isBeforeThursdayLock = now.getTime() < lockDate.getTime();

             if (isBeforeThursdayLock) {
                metadataToSave = { ...m.metadata, spreadLocked: false };
             } else {
                metadataToSave = { ...m.metadata, spreadLocked: true };
             }
          }

          batch.set(docRef, {
            campaignId: id,
            week: selectedWeek,
            gameId: String(m.gameId),
            title: m.title,
            startTime: m.startTime,
            status: m.status,
            statusDesc: m.statusDesc,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            type: campaign.defaultMatchType === "BOTH" ? ((metadataToSave?.spread !== undefined && metadataToSave?.spread !== null) ? "SPREAD" : "STANDARD") : (campaign.defaultMatchType || "STANDARD"),
            metadata: metadataToSave,
            createdAt: Date.now()
          }, { merge: true });`;

const newBlock = `          const pickemMatchupId = \`\${id}_\${selectedWeek}_\${m.gameId}\`;
          const docRef = doc(db, 'pickemMatchups', pickemMatchupId);

          const existingMatchup = matchups.find(ex => ex.id === pickemMatchupId);
          let metadataToSave = m.metadata ? { ...m.metadata } : null;
          let finalType = campaign.defaultMatchType === "BOTH" ? ((metadataToSave?.spread !== undefined && metadataToSave?.spread !== null) ? "SPREAD" : "STANDARD") : (campaign.defaultMatchType || "STANDARD");

          if (existingMatchup && existingMatchup.type) {
             finalType = existingMatchup.type; // Preserve admin overrides
          }

          // For CFB and NFL, check if it's before Thursday 2AM AZ time (9AM UTC) relative to the GAME'S week
          if ((lg === 'CFB' || lg === 'NFL') && metadataToSave) {
             // Find the previous Thursday at 9AM UTC relative to the game's start time
             const gameDate = new Date(m.startTime);
             const gameDay = gameDate.getUTCDay();

             const lockDate = new Date(m.startTime);
             let daysToSubtract = gameDay - 4;
             if (daysToSubtract < 0) {
                 daysToSubtract += 7; // e.g., if game is Wed (3), lock was last Thursday (subtract 6)
             }
             lockDate.setUTCDate(lockDate.getUTCDate() - daysToSubtract);
             lockDate.setUTCHours(9, 0, 0, 0); // 9 AM UTC

             const now = new Date();
             const isBeforeThursdayLock = now.getTime() < lockDate.getTime();

             if (isBeforeThursdayLock) {
                metadataToSave.spreadLocked = false;
             } else {
                metadataToSave.spreadLocked = true;
                if (existingMatchup && existingMatchup.metadata && existingMatchup.metadata.spread !== undefined) {
                   metadataToSave.spread = existingMatchup.metadata.spread; // Preserve the locked spread!
                }
             }
          }

          batch.set(docRef, {
            campaignId: id,
            week: selectedWeek,
            gameId: String(m.gameId),
            title: m.title,
            startTime: m.startTime,
            status: m.status,
            statusDesc: m.statusDesc,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            type: finalType,
            metadata: metadataToSave,
            createdAt: Date.now()
          }, { merge: true });`;

if (code.includes('const pickemMatchupId =')) {
  code = code.replace(oldBlock, newBlock);
  fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
  console.log("Successfully patched PickEmCampaignDetail.tsx");
} else {
  console.log("Could not find the target code to replace.");
}
