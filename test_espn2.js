async function run() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/llws/scoreboard?dates=20260824');
  const data = await res.json();
  const event = data.events ? data.events.find(e => e.id === '401896830') : null;
  if (event) {
    console.log(JSON.stringify(event.competitions[0].competitors, null, 2));
  } else {
    console.log('Keys:', Object.keys(data));
  }
}
run();
