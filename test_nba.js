import fs from 'fs';
fetch('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary?event=401585608')
  .then(res => res.json())
  .then(data => {
    const p = data.boxscore.players[0].statistics[0];
    console.log("NBA: type:", p.type, "name:", p.name);
  }).catch(e => console.log(e));
