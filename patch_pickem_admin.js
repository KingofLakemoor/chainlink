import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignsList.tsx', 'utf8');

const oldImports = `import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';`;
const newImports = `import { collection, getDocs, deleteDoc, doc, query, limit, orderBy } from 'firebase/firestore';`;

const oldFetch = `const snap = await getDocs(collection(db, 'pickemCampaigns'));`;
const newFetch = `const snap = await getDocs(query(collection(db, 'pickemCampaigns'), limit(100)));`;

if (content.includes("collection(db, 'pickemCampaigns')")) {
    content = content.replace(oldImports, newImports);
    content = content.replace(oldFetch, newFetch);
    fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignsList.tsx', content);
    console.log("Patched PickEmCampaignsList");
}
