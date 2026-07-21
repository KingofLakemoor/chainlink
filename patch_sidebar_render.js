import fs from 'fs';
let content = fs.readFileSync('src/components/SidebarProgress.tsx', 'utf8');

const targetProgress = `  const userProgress = Math.min(100, (activeUsers / (prizeData.activeUsersRequirement || 1)) * 100);
  const picksProgress = Math.min(100, (globalPicks / (prizeData.picksRequirement || 1)) * 100);`;

const replacementProgress = `  const userProgress = Math.min(100, (activeUsers / (prizeData.activeUsersRequirement || 1)) * 100);
  const picksProgress = Math.min(100, (globalPicks / (prizeData.picksRequirement || 1)) * 100);
  const referralsProgress = prizeData.referralsRequirement > 0 ? Math.min(100, (globalReferrals / prizeData.referralsRequirement) * 100) : 0;`;

content = content.replace(targetProgress, replacementProgress);

const targetRender = `          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400 flex items-center gap-1"><Target className="w-3 h-3"/> Picks</span>
              <span className="text-zinc-300">{String(globalPicks)} / {isNaN(Number(prizeData.picksRequirement)) ? 0 : String(prizeData.picksRequirement)}</span>
            </div>
            <Progress value={picksProgress} className="h-1.5" />
          </div>
        </div>`;

const replacementRender = `          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400 flex items-center gap-1"><Target className="w-3 h-3"/> Picks</span>
              <span className="text-zinc-300">{String(globalPicks)} / {isNaN(Number(prizeData.picksRequirement)) ? 0 : String(prizeData.picksRequirement)}</span>
            </div>
            <Progress value={picksProgress} className="h-1.5" />
          </div>
          
          {(prizeData.referralsRequirement || 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><Users className="w-3 h-3"/> Referrals</span>
                <span className="text-zinc-300">{String(globalReferrals)} / {String(prizeData.referralsRequirement)}</span>
              </div>
              <Progress value={referralsProgress} className="h-1.5" />
            </div>
          )}
        </div>`;

content = content.replace(targetRender, replacementRender);

fs.writeFileSync('src/components/SidebarProgress.tsx', content);
console.log("Patched sidebar render");
