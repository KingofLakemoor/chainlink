import fs from 'fs';
const data = JSON.parse(fs.readFileSync('mlb_test.json'));
const p = data.players[0].statistics.find(s => s.type === 'pitching');
console.log("type:", p.type, "name:", p.name);
