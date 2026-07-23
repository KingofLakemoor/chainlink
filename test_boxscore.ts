const id = '401816234';
const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${id}`;
fetch(url).then(res => res.json()).then(data => {
  console.log("Status:", data.header?.competitions?.[0]?.status?.type?.name);
  const players = data.boxscore?.players || [];
  players.forEach(team => {
    console.log(team.team.displayName);
    team.statistics.forEach(stat => {
      console.log(" -", stat.type || stat.name, stat.names || stat.labels);
    });
  });
}).catch(console.error);
