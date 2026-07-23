const id = '401816234';
const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${id}`;
fetch(url).then(res => res.json()).then(data => {
  const teams = data.header?.competitions?.[0]?.competitors || [];
  teams.forEach(t => console.log(t.team.displayName));
}).catch(console.error);
