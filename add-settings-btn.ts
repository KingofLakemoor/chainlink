import fs from 'fs';
let content = fs.readFileSync('src/pages/dashboard/DashboardPage.tsx', 'utf-8');

const targetHeader = `               <div className="flex items-center gap-1.5 justify-center md:justify-start">
                 <Calendar className="w-4 h-4 opacity-70" />
                 Joined {joinDate}
               </div>
            </div>
         </div>`;

const replaceHeader = `               <div className="flex items-center gap-1.5 justify-center md:justify-start">
                 <Calendar className="w-4 h-4 opacity-70" />
                 Joined {joinDate}
               </div>
            </div>
            
            <div className="mt-4 flex justify-center md:justify-start">
               <Link to="/profile">
                  <Button variant="outline" size="sm" className="bg-black/40 border-zinc-700 hover:bg-black/60 text-zinc-300">
                     <Settings className="w-4 h-4 mr-2" />
                     Settings & Inventory
                  </Button>
               </Link>
            </div>
         </div>`;

if (!content.includes('import { Settings } from "lucide-react";')) {
    content = content.replace(
      'import { ShoppingCart, Trophy, Link2, Coins, ChevronRight, Mail, Calendar,  } from \'lucide-react\';',
      'import { ShoppingCart, Trophy, Link2, Coins, ChevronRight, Mail, Calendar, Settings } from \'lucide-react\';'
    );
}

content = content.replace(targetHeader, replaceHeader);
fs.writeFileSync('src/pages/dashboard/DashboardPage.tsx', content);
