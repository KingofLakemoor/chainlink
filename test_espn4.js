async function run() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/llb/scoreboard?dates=20260824');
  const data = await res.json();
  const event = data.events ? data.events.find(e => e.id === '401896830') : null;
  if (event) {
    const a = event.competitions[0].competitors[0];
    const b = event.competitions[0].competitors[1];
    console.log(`[0] name: ${a.team?.name}, short: ${a.team?.shortDisplayName}, homeAway: ${a.homeAway}`);
    console.log(`[1] name: ${b.team?.name}, short: ${b.team?.shortDisplayName}, homeAway: ${b.homeAway}`);
  } else {
    console.log('Game not found on this date');
  }
}
run();
