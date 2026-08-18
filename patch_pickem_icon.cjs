const fs = require('fs');
const file = 'src/pages/pickem/PickEmPage.tsx';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes('HelpCircle')) {
  code = code.replace(/import \{ (.*?)\ } from 'lucide-react';/, "import { $1, HelpCircle } from 'lucide-react';");
}

const target = `<span className="text-zinc-400 font-bold text-xs">?</span>`;
const repl = `<HelpCircle className="w-4 h-4 text-zinc-400" />`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched PickEmPage icon!");
} else {
  console.log("Could not find target in PickEmPage.");
}
