import fs from 'fs';
let content = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf-8');

// The bad replace caused:
// const [useTiebreaker, 
//        entryFee: entryFee,setUseTiebreaker] = useState<boolean>(false);

content = content.replace(
  "const [useTiebreaker, \\n        entryFee: entryFee,setUseTiebreaker] = useState<boolean>(false);",
  "const [useTiebreaker, setUseTiebreaker] = useState<boolean>(false);"
);

content = content.replace(
  "const [useTiebreaker, \n        entryFee: entryFee,setUseTiebreaker] = useState<boolean>(false);",
  "const [useTiebreaker, setUseTiebreaker] = useState<boolean>(false);"
);

// We need to add entryFee to the save payload properly.
// Let's find:
/*
      await updateDoc(doc(db, 'pickemCampaigns', id), {
        name,
        description,
        isPrivate,
        joinCode: isPrivate ? joinCode : '',
        useTiebreaker, 
        hasWeekZero,
*/
// And update it.

content = content.replace(
  /useTiebreaker,\s*hasWeekZero,/,
  "useTiebreaker, \n        hasWeekZero,\n        entryFee: entryFee,"
);

fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', content);
