const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

if (!code.includes('app.get("/sw.js"')) {
  code = code.replace(
    "const distPath = path.join(process.cwd(), 'dist');",
    "const distPath = path.join(process.cwd(), 'dist');\n    app.get('/sw.js', (req, res) => { res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate'); res.sendFile(path.join(distPath, 'sw.js')); });"
  );
  fs.writeFileSync('server.ts', code);
}
