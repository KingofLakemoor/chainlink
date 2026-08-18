const fs = require('fs');
const file = 'src/pages/pickem/PickEmPage.tsx';
let code = fs.readFileSync(file, 'utf8');

const target = `  const handleClearPick = async (matchup: any) => {
    if (!user || !selectedCampaign) return;
    if (matchup.status !== 'STATUS_SCHEDULED' || (!!matchup.startTime && Date.now() >= matchup.startTime)) return;

    try {
      const pickId = \`\${selectedCampaign.id}_\${selectedWeek}_\${matchup.id}_\${user.uid}\`;
      const pickRef = doc(db, 'pickemPicks', pickId);
      await deleteDoc(pickRef);
      setUserPicks(prev => {
        const next = { ...prev };
        delete next[matchup.id];
        return next;
      });
    } catch (err: any) {
      console.error(err);
      console.log('Failed to clear pick');
    }
  };`;

const repl = `  const handleClearPick = async (matchup: any) => {
    if (!user || !selectedCampaign) return;
    if (matchup.status !== 'STATUS_SCHEDULED' || (!!matchup.startTime && Date.now() >= matchup.startTime)) return;

    try {
      const pickId = userPicks[matchup.id]?.id || \`\${selectedCampaign.id}_\${selectedWeek}_\${matchup.id}_\${user.uid}\`;
      const pickRef = doc(db, 'pickemPicks', pickId);
      await deleteDoc(pickRef);
      setUserPicks(prev => {
        const next = { ...prev };
        delete next[matchup.id];
        return next;
      });
    } catch (err: any) {
      console.error(err);
      alert('Failed to clear pick: ' + (err.message || String(err)));
    }
  };`;

if (code.includes(target)) {
  code = code.replace(target, repl);
  fs.writeFileSync(file, code);
  console.log("Patched handleClearPick");
} else {
  // try replacing without the catch (err: any) (maybe it's catch (err) )
  const target2 = target.replace('catch (err: any)', 'catch (err)');
  const repl2 = repl.replace('catch (err: any)', 'catch (err: any)');
  if (code.includes(target2)) {
    code = code.replace(target2, repl2);
    fs.writeFileSync(file, code);
    console.log("Patched handleClearPick (catch err)");
  } else {
    console.log("Could not find handleClearPick");
  }
}
