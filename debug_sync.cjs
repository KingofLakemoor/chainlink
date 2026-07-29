const admin = require('firebase-admin');
const fetch = require('node-fetch'); // we can install node-fetch if needed or use native fetch

async function run() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=20260730');
  const d = await res.json();
  const events = d.events || [];
  console.log("Events from API:", events.length);
  events.forEach(e => {
    const comp = e.competitions[0];
    const gameTime = new Date(comp.date).getTime();
    console.log(e.name, new Date(gameTime).toLocaleString());
  });
}
run();
