import fs from 'fs';
let p = 'src/pages/admin/logs/OrdersAdminPage.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
    "import { collection, query, orderBy, getDocs } from 'firebase/firestore';",
    "import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';"
);
c = c.replace(
    "const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));",
    "const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));"
);
fs.writeFileSync(p, c);
console.log("Patched orders");
