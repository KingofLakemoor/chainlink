const fs = require('fs');
const path = './src/pages/play/PlayDashboard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `      if (matchup) {
        if (matchup.type === 'OVER_UNDER') {
          if (p.pick?.id === 'OVER') counts[p.matchupId].away += 1;
          else if (p.pick?.id === 'UNDER') counts[p.matchupId].home += 1;
        } else {
          if (p.pick?.id === matchup.awayTeam?.id) counts[p.matchupId].away += 1;
          else if (p.pick?.id === matchup.homeTeam?.id) counts[p.matchupId].home += 1;
        }
      }`;

const replace = `      if (matchup) {
        if (matchup.metadata?.isYesOnly) {
           if (p.pick?.id === 'OVER' || p.pick?.id === 'yes' || p.pick?.id === matchup.awayTeam?.id) {
             counts[p.matchupId].away += 1;
           }
        } else if (matchup.type === 'OVER_UNDER') {
          if (p.pick?.id === 'OVER') counts[p.matchupId].away += 1;
          else if (p.pick?.id === 'UNDER') counts[p.matchupId].home += 1;
        } else {
          if (p.pick?.id === matchup.awayTeam?.id) counts[p.matchupId].away += 1;
          else if (p.pick?.id === matchup.homeTeam?.id) counts[p.matchupId].home += 1;
        }
      }`;

content = content.replace(target, replace);
fs.writeFileSync(path, content);
