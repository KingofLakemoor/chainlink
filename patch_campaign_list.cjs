const fs = require('fs');
const file = 'src/pages/admin/pickem/PickEmCampaignsList.tsx';
let code = fs.readFileSync(file, 'utf8');

const importTarget = `import { Edit, Trash2, Plus } from 'lucide-react';`;
const importRepl = `import { Edit, Trash2, Plus, Archive, ArchiveRestore } from 'lucide-react';
import { updateDoc } from 'firebase/firestore';`;

if (code.includes(importTarget)) {
  code = code.replace(importTarget, importRepl);
}

const toggleTarget = `  const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, 'pickemCampaigns', id));
    fetchData();
  };`;
const toggleRepl = `  const handleDelete = async (id: string) => {
        await deleteDoc(doc(db, 'pickemCampaigns', id));
    fetchData();
  };

  const handleToggleArchive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'pickemCampaigns', id), { isArchived: !currentStatus });
      fetchData();
    } catch (err) {
      console.error("Failed to toggle archive", err);
    }
  };`;

if (code.includes(toggleTarget)) {
  code = code.replace(toggleTarget, toggleRepl);
}

const theadTarget = `<th className="px-4 py-3 font-medium">Name</th>`;
const theadRepl = `<th className="px-4 py-3 font-medium">Name</th>
<th className="px-4 py-3 font-medium">Status</th>`;
if (code.includes(theadTarget)) {
  code = code.replace(theadTarget, theadRepl);
}

const tbodyTarget = `<td className="px-4 py-3 font-medium text-zinc-200">{camp.name}</td>`;
const tbodyRepl = `<td className="px-4 py-3 font-medium text-zinc-200">{camp.name}</td>
<td className="px-4 py-3">
  {camp.isArchived ? (
    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded text-xs font-medium border border-yellow-500/20">Archived</span>
  ) : (
    <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-medium border border-green-500/20">Active</span>
  )}
</td>`;
if (code.includes(tbodyTarget)) {
  code = code.replace(tbodyTarget, tbodyRepl);
}

const actionTarget = `<Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                        onClick={() => navigate(\`/admin/pickem/campaign/\${camp.id}\`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>`;
const actionRepl = `<Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-zinc-400 hover:text-white"
                        onClick={() => navigate(\`/admin/pickem/campaign/\${camp.id}\`)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={camp.isArchived ? "Unarchive" : "Archive"}
                        className="h-8 w-8 text-zinc-400 hover:text-yellow-400 hover:bg-yellow-400/10"
                        onClick={() => handleToggleArchive(camp.id, !!camp.isArchived)}
                      >
                        {camp.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                      </Button>`;
if (code.includes(actionTarget)) {
  code = code.replace(actionTarget, actionRepl);
}

fs.writeFileSync(file, code);
console.log("Patched PickEmCampaignsList!");
