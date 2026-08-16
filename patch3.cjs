const fs = require('fs');
const path = './src/components/ui/MatchupCard.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = `             {(pickData?.pick?.id === 'OVER' || pickData?.pick?.id === 'yes') && (
               <div className="text-[10px] font-bold text-[#22c55e] uppercase tracking-wider">
                 Selected
               </div>
             )}
          </div>`;

const replace = `             {(pickData?.pick?.id === 'OVER' || pickData?.pick?.id === 'yes') && (
               <div className="text-[10px] font-bold text-[#22c55e] uppercase tracking-wider">
                 Selected
               </div>
             )}
             <div className="w-full mt-1 flex flex-col items-center relative">
               <div className="w-16 sm:w-20 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden flex justify-start shadow-sm border border-zinc-800/50">
                 <div className={cn("h-full rounded-full transition-all duration-500", getHotBarClass(awayHotPct))} style={{ width: \`\${awayHotPct}%\` }}></div>
               </div>
               {awayHotPct >= 50 && (
                 <div className="absolute top-2 w-full flex justify-center">
                   <div className="text-[10px] font-bold text-red-500 flex items-center justify-center tracking-wider gap-0.5 drop-shadow-md">Hot <span className="text-xs">🔥</span></div>
                 </div>
               )}
             </div>
          </div>`;

content = content.replace(target, replace);
fs.writeFileSync(path, content);
