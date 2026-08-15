async function run() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=401568478');
  const data = await res.json();
  if (data.boxscore && data.boxscore.players) {
    for (const team of data.boxscore.players) {
      console.log(team.team.displayName);
      for (const statCat of team.statistics) {
         console.log(' - ' + statCat.name + ': ' + statCat.keys.join(', '));
      }
    }
  }
}
run();
