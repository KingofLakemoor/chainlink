async function run() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401584689');
  const data = await res.json();
  const player = data.boxscore.players[0].statistics[0].athletes.find(a => a.athlete.displayName === 'LeBron James');
  if (player) {
     const keys = data.boxscore.players[0].statistics[0].keys;
     console.log('Keys:', keys);
     console.log('Stats:', player.stats);
  }
}
run();
