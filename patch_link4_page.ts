import fs from 'fs';
let code = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf-8');

const fallbackCode = `    }, async (error) => {
      console.error('Error fetching link4 matchups', error);
      // Fallback if rules are not deployed
      try {
        const res = await fetch(\`/api/link4/matchups/\${activeSegmentId}\`);
        if (res.ok) {
           const data = await res.json();
           if (data.success && data.matchups) {
              setAllMatchups(data.matchups);
           }
        }
      } catch(e) {
        console.error("API fallback also failed", e);
      }
    });`;

code = code.replace(/},\s*\(error\)\s*=>\s*\{\s*console\.error\('Error fetching link4 matchups',\s*error\);\s*\}\);/, fallbackCode);
fs.writeFileSync('src/pages/link4/Link4Page.tsx', code);
