async function run() {
  const r = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard');
  const d = await r.json();
  console.log(JSON.stringify(d.events[0].competitions[0].competitors[0].team, null, 2));
}
run();
