const https = require('https');
https.get('https://site.api.espn.com/apis/site/v2/sports/baseball/llb/scoreboard', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.events && parsed.events.length > 0) {
        const comps = parsed.events[0].competitions[0].competitors;
        console.log(JSON.stringify(comps.map(c => ({ id: c.id, homeAway: c.homeAway, name: c.team?.displayName, logo: c.team?.logo })), null, 2));
      } else {
        console.log("No events found");
      }
    } catch(e) { console.error(e); }
  });
});
