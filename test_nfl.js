import fs from 'fs';
fetch('https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401547379')
  .then(res => res.json())
  .then(data => {
    fs.writeFileSync('nfl_test.json', JSON.stringify(data.boxscore, null, 2));
    const p = data.boxscore.players[0].statistics[0];
    console.log("NFL: type:", p.type, "name:", p.name);
  });
