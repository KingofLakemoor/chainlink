const axios = require('axios');
async function run() {
  const res = await axios.get('https://site.api.espn.com/apis/site/v2/sports/baseball/llws/scoreboard');
  const event = res.data.events.find(e => e.id === '401896830');
  if (event) {
    console.log(JSON.stringify(event.competitions[0].competitors, null, 2));
  } else {
    console.log('Game not found in scoreboard');
  }
}
run();
