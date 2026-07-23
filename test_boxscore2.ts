const id = '401816234';
const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${id}`;
fetch(url).then(res => res.json()).then(data => {
  const players = data.boxscore?.players || [];
  players.forEach(team => {
    team.statistics.forEach(stat => {
      if ((stat.type || stat.name) === 'pitching') {
         const kIndex = (stat.names || stat.labels).indexOf('K');
         stat.athletes.forEach(a => {
            if (a.athlete.id === '4346117' || a.athlete.id === '40912') {
               console.log(a.athlete.id, a.athlete.displayName, "Strikeouts:", a.stats[kIndex]);
            }
         });
      }
    });
  });
}).catch(console.error);
