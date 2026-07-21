const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

code = code.replace(
  '<div className="text-center text-xs text-zinc-600 font-bold uppercase">@</div>',
  `{m.type === 'PROP' ? <div className="text-center text-xs text-zinc-600 font-bold uppercase">VS</div> : <div className="text-center text-xs text-zinc-600 font-bold uppercase">@</div>}`
);

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
