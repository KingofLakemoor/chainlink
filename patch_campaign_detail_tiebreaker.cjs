const fs = require('fs');
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', 'utf8');

if (!code.includes('isTiebreaker: true')) {
    const handleToggleTiebreaker = `
  const handleToggleTiebreaker = async (matchupId: string, currentVal: boolean) => {
    try {
      await updateDoc(doc(db, "pickemMatchups", matchupId), {
        isTiebreaker: !currentVal
      });
      setMatchups(prev => prev.map(m => m.id === matchupId ? { ...m, isTiebreaker: !currentVal } : m));
    } catch (err) {
      console.error(err);
      console.log("Failed to toggle tiebreaker");
    }
  };
`;
    code = code.replace("const handleToggleSpread = async", handleToggleTiebreaker + "\n  const handleToggleSpread = async");

    // Add Tiebreaker to table
    code = code.replace('<th className="px-4 py-3 font-medium text-center">Type</th>',
    '<th className="px-4 py-3 font-medium text-center">Type</th>\n                  <th className="px-4 py-3 font-medium text-center">Tiebreaker</th>');

    const tiebreakerTd = `
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleTiebreaker(m.id, !!m.isTiebreaker)}
                        className={\`px-2 py-1 text-xs rounded-md font-bold \${m.isTiebreaker ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}\`}
                      >
                        {m.isTiebreaker ? "YES" : "NO"}
                      </button>
                    </td>
`;
    code = code.replace(/<td className="px-4 py-3 text-center">\s*<button\s*onClick={\(\) => handleToggleSpread[\s\S]*?<\/td>/,
    `$&` + tiebreakerTd);

    fs.writeFileSync('src/pages/admin/pickem/PickEmCampaignDetail.tsx', code);
}
