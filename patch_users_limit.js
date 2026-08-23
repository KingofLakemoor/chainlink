import fs from 'fs';

// 1. UserCosmeticsAdminPage.tsx
let p1 = 'src/pages/admin/users/UserCosmeticsAdminPage.tsx';
let c1 = fs.readFileSync(p1, 'utf8');
if (!c1.includes('limit(100)')) {
    c1 = c1.replace(
        "import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';",
        "import { collection, getDocs, doc, updateDoc, query, limit, orderBy } from 'firebase/firestore';"
    );
    c1 = c1.replace(
        "const snap = await getDocs(collection(db, 'users'));",
        "const snap = await getDocs(query(collection(db, 'users'), limit(200)));"
    );
    c1 = c1.replace(
        "<h2 className=\"text-xl font-bold mb-4\">User Cosmetics Administration</h2>",
        "<h2 className=\"text-xl font-bold mb-4\">User Cosmetics Administration</h2>\n      <p className=\"text-xs text-yellow-500 mb-4 bg-yellow-500/10 p-2 rounded border border-yellow-500/20\">\n        Viewing top 200 users to prevent unbounded database reads.\n      </p>"
    );
    fs.writeFileSync(p1, c1);
    console.log("Patched " + p1);
}

// 2. ReferralsAdminPage.tsx
let p2 = 'src/pages/admin/referrals/ReferralsAdminPage.tsx';
let c2 = fs.readFileSync(p2, 'utf8');
if (!c2.includes('limit(200)')) {
    c2 = c2.replace(
        "import { collection, getDocs } from 'firebase/firestore';",
        "import { collection, getDocs, query, limit } from 'firebase/firestore';"
    );
    c2 = c2.replace(
        "const snap = await getDocs(collection(db, 'users'));",
        "const snap = await getDocs(query(collection(db, 'users'), limit(500)));"
    );
    c2 = c2.replace(
        "<p className=\"text-zinc-500\">No referral chains found.</p>",
        "<p className=\"text-zinc-500\">No referral chains found (limited to 500 recent users to save costs).</p>"
    );
    fs.writeFileSync(p2, c2);
    console.log("Patched " + p2);
}

// 3. AchievementsListPage.tsx
let p3 = 'src/pages/admin/achievements/AchievementsListPage.tsx';
let c3 = fs.readFileSync(p3, 'utf8');
if (!c3.includes('limit(500)')) {
    c3 = c3.replace(
        "import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';",
        "import { collection, getDocs, deleteDoc, doc, updateDoc, query, limit } from 'firebase/firestore';"
    );
    c3 = c3.replace(
        "const userSnap = await getDocs(collection(db, 'users'));",
        "const userSnap = await getDocs(query(collection(db, 'users'), limit(500)));"
    );
    fs.writeFileSync(p3, c3);
    console.log("Patched " + p3);
}

