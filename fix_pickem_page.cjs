const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

code = code.replace(
  `import { collection, getDocs, limit, doc, query, where, setDoc, getDoc, deleteDoc, documentId } from 'firebase/firestore';`,
  `import { collection, getDocs, limit, doc, query, where, setDoc, getDoc, deleteDoc, documentId, updateDoc } from 'firebase/firestore';`
);

code = code.replace(
  `    if (!user || !selectedCampaign) return;
    if (isEliminated && selectedCampaign.format === 'SURVIVOR') return;
    if (selectedCampaign.format === 'SURVIVOR' && usedTeams.has(teamId)) {
       alert('You have already picked this team in a previous week!');
       return;
    }`,
  `    if (!user || !selectedCampaign) return;
    if (isEliminated && selectedCampaign.format === 'SURVIVOR') return;`
);

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
