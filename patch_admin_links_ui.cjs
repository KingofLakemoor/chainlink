const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/users/AddLinksAdminPage.tsx', 'utf8');

code = code.replace(
`import { collection, getDocs, doc, updateDoc, query, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';`,
`import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../../lib/firebase';`
);

const newHandler = `
  const handleUpdateLinks = async () => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/admin/update-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \$\{token\}\`
        },
        body: JSON.stringify({ targetUserId: selectedUser.id, amount })
      });
      const data = await res.json();
      
      if (!res.ok || !data.success) {
         throw new Error(data.error || "Failed to update links");
      }

      const newLinks = data.newLinks;

      // Update local state
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, links: newLinks } : u));
      setSelectedUser({ ...selectedUser, links: newLinks });
      setAmount(0);
      alert(\`Successfully updated links for \$\{selectedUser.username || selectedUser.name\}.\`);
    } catch (e: any) {
      console.error("Error updating links:", e);
      alert("Failed to update links: " + e.message);
    } finally {
      setSaving(false);
    }
  };
`;

code = code.replace(
/const handleUpdateLinks = async \(\) => \{[\s\S]*?finally \{\s*setSaving\(false\);\s*\}\s*\};/,
newHandler.trim()
);

fs.writeFileSync('src/pages/admin/users/AddLinksAdminPage.tsx', code);
