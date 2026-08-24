const fs = require('fs');
const data = JSON.parse(fs.readFileSync('llws.json', 'utf8'));
if(data.events) {
  data.events.forEach(e => {
    const comp = e.competitions[0];
    console.log(`Event: ${e.shortName}`);
    comp.competitors.forEach(c => {
      console.log(`  ${c.homeAway}: ${c.team.displayName} -> ${c.team.logo}`);
    });
  });
} else {
  console.log("No events");
}
