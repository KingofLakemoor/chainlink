import fs from 'fs';

let p = 'src/pages/admin/brackets/BracketEntriesAdminPage.tsx';
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
    "import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';",
    "import { collection, query, where, getDocs, doc, getDoc, limit } from 'firebase/firestore';"
);

c = c.replace(
    "const pQuery = query(collection(db, 'bracketGamePredictions'), where('bracketId', '==', id));",
    "const pQuery = query(collection(db, 'bracketGamePredictions'), where('bracketId', '==', id), limit(100));"
);

fs.writeFileSync(p, c);
console.log("Patched bracket2");

