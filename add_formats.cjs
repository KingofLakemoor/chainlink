const fs = require('fs');

// PickEmCreateCampaign
let code = fs.readFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', 'utf8');
if (!code.includes('setFormat')) {
    code = code.replace("const [defaultMatchType, setDefaultMatchType] = useState('STANDARD');", 
    "const [defaultMatchType, setDefaultMatchType] = useState('STANDARD');\n  const [format, setFormat] = useState('STANDARD');");

    code = code.replace("defaultMatchType,", "defaultMatchType,\n      format,");

    const formatHtml = `
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-1">Campaign Format</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value)}
              className="w-full bg-[#18181A] border border-zinc-800 rounded-lg px-4 py-2 text-white"
            >
              <option value="STANDARD">Standard</option>
              <option value="SURVIVOR">Survivor Mode (One pick/week, lose = eliminated)</option>
              <option value="CONFIDENCE">Confidence Points</option>
            </select>
          </div>
`;
    code = code.replace(`          <div>\n            <label className="block text-sm font-medium text-zinc-400 mb-1">Total Weeks in Campaign</label>`, formatHtml + `          <div>\n            <label className="block text-sm font-medium text-zinc-400 mb-1">Total Weeks in Campaign</label>`);
    fs.writeFileSync('src/pages/admin/pickem/PickEmCreateCampaign.tsx', code);
}
