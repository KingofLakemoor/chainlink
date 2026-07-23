const id = '401816234';
const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${id}`;
fetch(url).then(res => res.json()).then(data => {
  for (const teamTeam of data.boxscore.players) {
    for (const statGroup of teamTeam.statistics) {
       console.log("Group:", statGroup.name || statGroup.type, "names:", statGroup.names, "labels:", statGroup.labels, "keys:", Object.keys(statGroup));
    }
  }
}).catch(console.error);
