const fs = require('fs');
const data = JSON.parse(fs.readFileSync('llws.json', 'utf8'));
data.events.forEach(e => {
  const comp = e.competitions[0];
  console.log(`Event: ${e.shortName}`);
  const a = comp.competitors[0];
  const b = comp.competitors[1];
  console.log(`  [0] name: ${a.team.displayName}, homeAway: ${a.homeAway}, logo: ${a.team.logo}`);
  console.log(`  [1] name: ${b.team.displayName}, homeAway: ${b.homeAway}, logo: ${b.team.logo}`);
});
