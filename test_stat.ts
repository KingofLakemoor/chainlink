const id = '401816234';
const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${id}`;
fetch(url).then(res => res.json()).then(data => {
  for (const teamTeam of data.boxscore.players) {
    for (const statGroup of teamTeam.statistics) {
       for (const athleteStat of statGroup.athletes || []) {
           if (athleteStat.athlete.id === '4346117' || athleteStat.athlete.id === '40912') {
               console.log("Found athlete:", athleteStat.athlete.displayName, "in group", statGroup.name || statGroup.type, "with stats:", athleteStat.stats, "labels:", statGroup.names || statGroup.labels);
           }
       }
    }
  }
}).catch(console.error);
