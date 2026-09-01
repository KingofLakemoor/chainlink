import * as fs from 'fs';

let content = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf8');

const target = `
        const now = Date.now();
        camps = camps.filter((c: any) => {
          const hasDates = c.startDate && c.endDate;
          if (!hasDates) return true; // Keep legacy campaigns
          const startToCheck = c.visibleDate || c.startDate;
          return now >= startToCheck; // Keep past campaigns
        });
`;

const replacement = `
        let joinedIds = new Set<string>();
        if (user) {
          const partQuery = query(collection(db, 'pickemParticipants'), where('participantId', '==', user.uid));
          const partSnap = await getDocs(partQuery);
          joinedIds = new Set(partSnap.docs.map(d => d.data().campaignId));
        }

        const now = Date.now();
        camps = camps.filter((c: any) => {
          if (joinedIds.has(c.id)) return true; // Always keep if user joined
          if (campaignId === c.id) return true; // Always keep if specifically requested in URL
          const hasDates = c.startDate && c.endDate;
          if (!hasDates) return true; // Keep legacy campaigns
          const startToCheck = c.visibleDate || c.startDate;
          return now >= startToCheck; // Keep past campaigns
        });
`;

content = content.replace(target, replacement);
fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', content);
console.log('PickEmPage.tsx patched');
