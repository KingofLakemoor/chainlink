import https from 'https';

const req = https.get('https://site.api.espn.com/apis/site/v2/sports/baseball/llb/scoreboard?dates=20260824', {
  headers: {
    'User-Agent': 'Mozilla/5.0'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.events) {
        parsed.events.forEach(e => {
          console.log(`Event: ${e.name}`);
          e.competitions[0].competitors.forEach(c => {
             console.log(`  ${c.homeAway}: ${c.team?.displayName} -> ${c.team?.logo}`);
          });
        });
      }
    } catch (e) { console.log(data.substring(0, 200)); }
  });
});
req.on('error', console.error);
