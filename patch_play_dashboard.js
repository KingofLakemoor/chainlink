import fs from 'fs';

let content = fs.readFileSync('src/pages/play/PlayDashboard.tsx', 'utf8');

if (!content.includes('orderBy')) {
    content = content.replace("import { collection, query, where, onSnapshot, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';", "import { collection, query, where, onSnapshot, getDocs, doc, setDoc, deleteDoc, orderBy, limit } from 'firebase/firestore';");
}

const oldPicksBlock = `        const q = query(collection(db, 'picks'), where('userId', '==', user.uid));
        unsubPicks = onSnapshot(q, (pickSnap) => {
          const picksInfo: Record<string, any> = {};
          pickSnap.docs.forEach(d => {
            const data = d.data();
            picksInfo[data.matchupId] = data;
          });
          setUserPicks(picksInfo);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, \`picks/user/\${user.uid}\`);
        });

        // Fetch all pending picks for global hot rating
        const globalQ = query(collection(db, 'picks'), where('status', '==', 'PENDING'));
        unsubGlobalPicks = onSnapshot(globalQ, (globalPickSnap) => {
          const allUpcomingPicks = globalPickSnap.docs.map(d => d.data());
          setGlobalUpcomingPicks(allUpcomingPicks);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'picks/pending');
        });`;

const newPicksBlock = `        // Bound the user picks to recent history (50 picks) to prevent unbounded growth
        const q = query(collection(db, 'picks'), where('userId', '==', user.uid), orderBy('updatedAt', 'desc'), limit(50));
        unsubPicks = onSnapshot(q, (pickSnap) => {
          const picksInfo: Record<string, any> = {};
          pickSnap.docs.forEach(d => {
            const data = d.data();
            picksInfo[data.matchupId] = data;
          });
          setUserPicks(picksInfo);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, \`picks/user/\${user.uid}\`);
        });

        // Fetch a bounded sample for global hot rating to avoid fetching the entire database
        const globalQ = query(collection(db, 'picks'), where('status', '==', 'PENDING'), limit(200));
        getDocs(globalQ).then(globalPickSnap => {
          const allUpcomingPicks = globalPickSnap.docs.map(d => d.data());
          setGlobalUpcomingPicks(allUpcomingPicks);
        }).catch(error => {
          handleFirestoreError(error, OperationType.LIST, 'picks/pending');
        });
        unsubGlobalPicks = () => {};`;

if (content.includes("const q = query(collection(db, 'picks'), where('userId', '==', user.uid));")) {
    content = content.replace(oldPicksBlock, newPicksBlock);
    fs.writeFileSync('src/pages/play/PlayDashboard.tsx', content);
    console.log("Patched PlayDashboard.tsx");
} else {
    console.log("Could not find the target block.");
}
