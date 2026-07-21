const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/matchups/AdminMatchups.tsx', 'utf8');

if (!code.includes('to="/admin/prop-builder"')) {
  code = code.replace(
    '<Link to="/admin/pga-builder">\n            <Button className="bg-green-600 hover:bg-green-700">PGA Matchup Builder</Button>\n          </Link>',
    '<Link to="/admin/pga-builder">\n            <Button className="bg-green-600 hover:bg-green-700">PGA Matchup Builder</Button>\n          </Link>\n          <Link to="/admin/prop-builder">\n            <Button className="bg-blue-600 hover:bg-blue-700">Player Prop Builder</Button>\n          </Link>'
  );
}

fs.writeFileSync('src/pages/admin/matchups/AdminMatchups.tsx', code);
