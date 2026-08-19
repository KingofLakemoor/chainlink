const https = require('https');
https.get('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard', { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', (c) => data += c);
  res.on('end', () => {
    const json = JSON.parse(data);
    if(json.events && json.events.length > 0) {
      console.log(JSON.stringify(json.events[0].competitions[0].competitors[0].team, null, 2));
    }
  });
});
