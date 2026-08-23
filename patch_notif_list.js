import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/notifications/NotificationsListPage.tsx', 'utf8');

// Ensure proper imports
if (!content.includes('limit') && !content.includes('orderBy')) {
    content = content.replace("import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';", "import { collection, getDocs, deleteDoc, doc, updateDoc, query, orderBy, limit, where, documentId } from 'firebase/firestore';");
}

const oldFetchData = `  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch users for mapping targetUserId to username
      const usersSnap = await getDocs(collection(db, 'users'));
      const mapping: Record<string, string> = {};
      usersSnap.docs.forEach(d => {
        mapping[d.id] = d.data().username || d.data().email || d.id;
      });
      setUserMap(mapping);

      const snap = await getDocs(collection(db, 'notifications'));
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };`;

const newFetchData = `  const fetchData = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'notifications'), orderBy('scheduledTime', 'desc'), limit(100)));
      const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setNotifications(notifs);

      const targetUids = [...new Set(notifs.filter(n => n.targetUserId).map(n => n.targetUserId))];
      const mapping: Record<string, string> = {};
      
      const chunkArray = (arr: any[], size: number): any[][] => arr.length ? [arr.slice(0, size), ...chunkArray(arr.slice(size), size)] : [];
      if (targetUids.length > 0) {
        const userChunks = chunkArray(targetUids, 30);
        for (const chunk of userChunks) {
           const uSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', chunk)));
           uSnap.forEach(doc => {
              const u = doc.data();
              mapping[doc.id] = u.username || u.email || doc.id;
           });
        }
      }
      setUserMap(mapping);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };`;

if (content.includes('const usersSnap = await getDocs(collection(db, \'users\'));')) {
    content = content.replace(oldFetchData, newFetchData);
    fs.writeFileSync('src/pages/admin/notifications/NotificationsListPage.tsx', content);
    console.log("Patched NotificationsListPage.tsx");
}
