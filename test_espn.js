async function run() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/llws/scoreboard');
  const data = await res.json();
  const event = data.events.find(e => e.id === '401896830');
  if (event) {
    console.log(JSON.stringify(event.competitions[0].competitors, null, 2));
  } else {
    console.log('Game not found in scoreboard');
  }
}
run();
