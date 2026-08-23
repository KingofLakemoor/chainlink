import fs from 'fs';
let p = 'src/pages/admin/announcements/AnnouncementsAdminPage.tsx';
let c = fs.readFileSync(p, 'utf8');

if (!c.includes("limit(")) {
    c = c.replace(
        "import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';",
        "import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, limit } from 'firebase/firestore';"
    );
    c = c.replace(
        "const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));",
        "const q = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(100));"
    );
    fs.writeFileSync(p, c);
    console.log("Patched announcements");
}
