const id = '401816234';
const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${id}`;
fetch(url).then(res => res.json()).then(data => {
  console.log(JSON.stringify(data.header?.competitions?.[0]?.status, null, 2));
}).catch(console.error);
