const fs = require('fs');
const data = JSON.parse(fs.readFileSync('llws.json', 'utf8'));
data.events.forEach(e => {
  if (e.id === '401896838') {
      console.log(`Event: ${e.shortName}`);
      e.competitions[0].competitors.forEach(c => {
         console.log(`  ${c.homeAway}: ${c.team.displayName} -> ${c.team.logo}`);
      });
  }
});
