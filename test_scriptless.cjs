const http = require('https');
http.get('https://scriptless.club602.com/api/chainlink/matchups', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => console.log(data));
}).on('error', (e) => console.error(e));
