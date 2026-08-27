import fs from 'fs';
let code = fs.readFileSync('src/pages/admin/link4/Link4SegmentDetail.tsx', 'utf-8');

const fallbackCode = `      } catch (fallbackErr: any) {
        console.warn('Fallback link4Matchups query failed:', fallbackErr);
        try {
          const res = await fetch(\`/api/link4/matchups/\${segmentId}\`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.matchups) {
              data.matchups.forEach((m: any) => docsMap.set(m.id, m));
            }
          }
        } catch (apiErr) {
          console.error("API fetch fallback also failed", apiErr);
        }
      }`;

code = code.replace(/} catch \(fallbackErr: any\) \{\s+console\.warn\('Fallback link4Matchups query failed:', fallbackErr\);\s+\}/, fallbackCode);
fs.writeFileSync('src/pages/admin/link4/Link4SegmentDetail.tsx', code);
