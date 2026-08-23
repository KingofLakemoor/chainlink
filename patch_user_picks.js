import fs from 'fs';

// 1. MyPicksPage.tsx
let p1 = 'src/pages/mypicks/MyPicksPage.tsx';
let c1 = fs.readFileSync(p1, 'utf8');
if (c1.includes("const q = query(collection(db, 'picks'), where('userId', '==', user.uid));")) {
    c1 = c1.replace(
        "const q = query(collection(db, 'picks'), where('userId', '==', user.uid));",
        "const q = query(collection(db, 'picks'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'), limit(100));"
    );
    if (!c1.includes('limit') && !c1.includes('orderBy')) {
        c1 = c1.replace(
            "import { collection, query, where, getDocs, onSnapshot, documentId } from 'firebase/firestore';",
            "import { collection, query, where, getDocs, onSnapshot, documentId, limit, orderBy } from 'firebase/firestore';"
        );
    }
    // And onSnapshot inside useEffect later?
    c1 = c1.replace(
        "const q = query(collection(db, 'picks'), where('userId', '==', user.uid));",
        "const q = query(collection(db, 'picks'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'), limit(100));"
    );
    fs.writeFileSync(p1, c1);
    console.log("Patched MyPicksPage.tsx");
}

// 2. ProfilePage.tsx
let p2 = 'src/pages/profile/ProfilePage.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
if (c2.includes("const q = query(collection(db, 'picks'), where('userId', '==', user.uid));")) {
    c2 = c2.replace(
        "const q = query(collection(db, 'picks'), where('userId', '==', user.uid));",
        "const q = query(collection(db, 'picks'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'), limit(300));"
    );
    
    if (!c2.includes('limit')) {
        c2 = c2.replace(
            "import { collection, getDocs, orderBy, query, where, documentId, doc, updateDoc } from 'firebase/firestore';",
            "import { collection, getDocs, orderBy, query, where, documentId, doc, updateDoc, limit } from 'firebase/firestore';"
        );
    }
    
    fs.writeFileSync(p2, c2);
    console.log("Patched ProfilePage.tsx");
}

// 3. AdminPicksPage.tsx
let p3 = 'src/pages/admin/picks/AdminPicksPage.tsx';
let c3 = fs.readFileSync(p3, 'utf8');
if (c3.includes("filterPending ? query(collection(db, 'picks'), where('status', '==', 'PENDING')) :")) {
    c3 = c3.replace(
        "const q = filterPending ? query(collection(db, 'picks'), where('status', '==', 'PENDING')) : query(collection(db, 'picks'), limit(1000));",
        "const q = filterPending ? query(collection(db, 'picks'), where('status', '==', 'PENDING'), limit(1000)) : query(collection(db, 'picks'), limit(1000));"
    );
    
    fs.writeFileSync(p3, c3);
    console.log("Patched AdminPicksPage.tsx");
}
