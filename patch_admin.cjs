const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignDetail.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `          const pickemMatchupId = \`\${id}_\${selectedWeek}_\${m.gameId}\`;
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
          }`;

const replacement = `          const pickemMatchupId = \`\${id}_\${selectedWeek}_\${m.gameId}\`;
          const docRef = doc(db, 'pickemMatchups', pickemMatchupId);
          let metadataToSave = m.metadata || null;

          // Preserve locked spreads if they already exist
          const existingMatchup = matchups.find(ex => ex.id === pickemMatchupId);

          // For CFB and NFL, check if it's before Thursday 2AM AZ time (9AM UTC) relative to the GAME'S week
          if ((lg === 'CFB' || lg === 'NFL') && m.metadata) { 
             const gameDate = new Date(m.startTime);
             const gameDay = gameDate.getUTCDay();
             const lockDate = new Date(m.startTime);
             
             let daysToSubtract = gameDay - 4;
             if (daysToSubtract < 0) {
                 daysToSubtract += 7;
             }
             lockDate.setUTCDate(lockDate.getUTCDate() - daysToSubtract);
             lockDate.setUTCHours(9, 0, 0, 0); // 9 AM UTC

             const now = new Date();
             const isBeforeThursdayLock = now.getTime() < lockDate.getTime();
             
             if (existingMatchup?.metadata?.spreadLocked && existingMatchup.metadata.spread !== undefined) {
                // If it was already locked, keep the existing spread and lock flag
                metadataToSave = { ...metadataToSave, spread: existingMatchup.metadata.spread, spreadLocked: true };
             } else if (isBeforeThursdayLock) {
                metadataToSave = { ...m.metadata, spreadLocked: false };
             } else {
                metadataToSave = { ...m.metadata, spreadLocked: true };
             }
          }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content);
    console.log("Admin patched successfully");
} else {
    console.log("Could not find target in admin");
}
