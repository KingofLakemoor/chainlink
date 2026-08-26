import fs from 'fs';
let content = fs.readFileSync('src/pages/dashboard/DashboardPage.tsx', 'utf-8');

// 1. Add import for ProfileSettingsModal
if (!content.includes("import { ProfileSettingsModal }")) {
   content = content.replace(
      "import { TitleMap } from '../../components/ui/titles';",
      "import { TitleMap } from '../../components/ui/titles';\nimport { ProfileSettingsModal } from '../../components/profile/ProfileSettingsModal';"
   );
}

// 2. Add state for modal
content = content.replace(
  'const [announcements, setAnnouncements] = React.useState<any[]>([]);',
  'const [announcements, setAnnouncements] = React.useState<any[]>([]);\n  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);'
);

// 3. Update the button we added earlier to use the modal instead of <Link>
const oldButton = `            <div className="mt-4 flex justify-center md:justify-start">
               <Link to="/profile">
                  <Button variant="outline" size="sm" className="bg-black/40 border-zinc-700 hover:bg-black/60 text-zinc-300">
                     <Settings className="w-4 h-4 mr-2" />
                     Settings & Inventory
                  </Button>
               </Link>
            </div>`;
const newButton = `            <div className="mt-4 flex justify-center md:justify-start">
               <Button onClick={() => setIsSettingsOpen(true)} variant="outline" size="sm" className="bg-black/40 border-zinc-700 hover:bg-black/60 text-zinc-300">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings & Inventory
               </Button>
            </div>`;
content = content.replace(oldButton, newButton);

// 4. Add the modal component at the end of the return statement
content = content.replace(
  '    </div>\n  );\n}',
  '      <ProfileSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />\n    </div>\n  );\n}'
);

fs.writeFileSync('src/pages/dashboard/DashboardPage.tsx', content);
