import fs from 'fs';
let content = fs.readFileSync('src/components/SidebarProgress.tsx', 'utf8');

const targetImport = `import { Trophy, Copy, Check, Users, Target } from 'lucide-react';`;
const replacementImport = `import { Trophy, Copy, Check, Users, Target, UserPlus } from 'lucide-react';`;
content = content.replace(targetImport, replacementImport);

const targetIcon = `<span className="text-zinc-400 flex items-center gap-1"><Users className="w-3 h-3"/> Referrals</span>`;
const replacementIcon = `<span className="text-zinc-400 flex items-center gap-1"><UserPlus className="w-3 h-3"/> Referrals</span>`;
content = content.replace(targetIcon, replacementIcon);

fs.writeFileSync('src/components/SidebarProgress.tsx', content);
