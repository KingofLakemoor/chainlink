import fs from 'fs';
fetch('https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=401569931')
  .then(res => res.json())
  .then(data => {
    fs.writeFileSync('mlb_test.json', JSON.stringify(data.boxscore, null, 2));
    console.log("Done");
  });
