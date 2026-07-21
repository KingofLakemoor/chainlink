import fs from 'fs';
let content = fs.readFileSync('src/components/SidebarProgress.tsx', 'utf8');

const targetUsers = `          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400 flex items-center gap-1"><Users className="w-3 h-3"/> Users</span>
              <span className="text-zinc-300">{String(activeUsers)} / {isNaN(Number(prizeData.activeUsersRequirement)) ? 0 : String(prizeData.activeUsersRequirement)}</span>
            </div>
            <Progress value={userProgress} className="h-1.5" />
          </div>`;

const replacementUsers = `          {(prizeData.activeUsersRequirement || 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><Users className="w-3 h-3"/> Users</span>
                <span className="text-zinc-300">{String(activeUsers)} / {String(prizeData.activeUsersRequirement)}</span>
              </div>
              <Progress value={userProgress} className="h-1.5" />
            </div>
          )}`;

content = content.replace(targetUsers, replacementUsers);

const targetPicks = `          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-zinc-400 flex items-center gap-1"><Target className="w-3 h-3"/> Picks</span>
              <span className="text-zinc-300">{String(globalPicks)} / {isNaN(Number(prizeData.picksRequirement)) ? 0 : String(prizeData.picksRequirement)}</span>
            </div>
            <Progress value={picksProgress} className="h-1.5" />
          </div>`;

const replacementPicks = `          {(prizeData.picksRequirement || 0) > 0 && (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-zinc-400 flex items-center gap-1"><Target className="w-3 h-3"/> Picks</span>
                <span className="text-zinc-300">{String(globalPicks)} / {String(prizeData.picksRequirement)}</span>
              </div>
              <Progress value={picksProgress} className="h-1.5" />
            </div>
          )}`;

content = content.replace(targetPicks, replacementPicks);

fs.writeFileSync('src/components/SidebarProgress.tsx', content);
