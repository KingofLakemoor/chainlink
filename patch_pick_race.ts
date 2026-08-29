import * as fs from 'fs';

let content = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf-8');

// 1. Clear timeout in handlePick
const timeoutClearCode = `
      if (tiebreakerTimeoutRef.current[matchup.id]) {
        clearTimeout(tiebreakerTimeoutRef.current[matchup.id]);
      }
`;
content = content.replace(
  "      const existingPick = userPicks[matchup.id];",
  "      const existingPick = userPicks[matchup.id];\n" + timeoutClearCode
);

// 2. Fix pick limit check to only count team picks
content = content.replace(
  "      // Check pick limit before adding a new pick (skip if replacing existing pick in same matchup)\n      if (!existingPick && selectedCampaign.pickLimit > 0) {\n        const currentPicksCount = Object.keys(userPicks).length;",
  "      // Check pick limit before adding a new pick (skip if replacing existing pick in same matchup)\n      const isNewTeamPick = !existingPick?.pick?.teamId;\n      if (isNewTeamPick && selectedCampaign.pickLimit > 0) {\n        const currentPicksCount = Object.values(userPicks).filter((p: any) => p.pick?.teamId).length;"
);

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', content);
console.log('Patched successfully');
