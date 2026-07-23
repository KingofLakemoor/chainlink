const id = '401816234';
const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${id}`;
fetch(url).then(res => res.json()).then(data => {
  if (data.boxscore?.players) {
    for (const p of data.boxscore.players) {
       console.log(p.team.name, "has", p.statistics.length, "stat groups");
    }
  } else {
    console.log("No players in boxscore");
  }
}).catch(console.error);
