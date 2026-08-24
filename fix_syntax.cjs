const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

code = code.replace(
`<div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
            <h3 className="font-bold text-lg text-white">Leaderboard</h3>`,
`<div className="bg-[#121212] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-[#18181A]">
            <h3 className="font-bold text-lg text-white">Leaderboard</h3>`);

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
