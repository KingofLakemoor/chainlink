import fs from 'fs';

let p1 = 'src/pages/admin/users/AddLinksAdminPage.tsx';
let c1 = fs.readFileSync(p1, 'utf8');
if (c1.includes("query(collection(db, 'users'), orderBy('createdAt', 'desc'))")) {
    c1 = c1.replace(
        "const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));",
        "const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));"
    );
    if (!c1.includes('limit')) {
        c1 = c1.replace(
            "import { collection, query, orderBy, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';",
            "import { collection, query, orderBy, getDocs, doc, updateDoc, writeBatch, limit } from 'firebase/firestore';"
        );
    }
    fs.writeFileSync(p1, c1);
    console.log("Patched AddLinksAdminPage.tsx");
}

let p2 = 'src/pages/admin/users/PremiumStatusAdminPage.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
if (c2.includes("query(collection(db, 'users'), orderBy('createdAt', 'desc'))")) {
    c2 = c2.replace(
        "const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));",
        "const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(100));"
    );
    if (!c2.includes('limit')) {
        c2 = c2.replace(
            "import { collection, query, orderBy, getDocs, doc, updateDoc } from 'firebase/firestore';",
            "import { collection, query, orderBy, getDocs, doc, updateDoc, limit } from 'firebase/firestore';"
        );
    }
    fs.writeFileSync(p2, c2);
    console.log("Patched PremiumStatusAdminPage.tsx");
}

