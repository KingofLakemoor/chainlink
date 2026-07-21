import fs from 'fs';
let content = fs.readFileSync('src/components/SidebarProgress.tsx', 'utf8');

const targetPicks = `          {(prizeData.picksRequirement || 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><Target className="w-3 h-3"/> Picks</span>
                <span className="text-zinc-300">{String(globalPicks)} / {String(prizeData.picksRequirement)}</span>
              </div>
              <Progress value={picksProgress} className="h-1.5" />
            </div>
          )}
          
        </div>`;
const replacementPicks = `          {(prizeData.picksRequirement || 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><Target className="w-3 h-3"/> Picks</span>
                <span className="text-zinc-300">{String(globalPicks)} / {String(prizeData.picksRequirement)}</span>
              </div>
              <Progress value={picksProgress} className="h-1.5" />
            </div>
          )}
          
          {(prizeData.referralsRequirement || 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><UserPlus className="w-3 h-3"/> Referrals</span>
                <span className="text-zinc-300">{String(globalReferrals)} / {String(prizeData.referralsRequirement)}</span>
              </div>
              <Progress value={referralsProgress} className="h-1.5" />
            </div>
          )}
        </div>`;

content = content.replace(targetPicks, replacementPicks);

fs.writeFileSync('src/components/SidebarProgress.tsx', content);
console.log("Patched sidebar referrals back");
