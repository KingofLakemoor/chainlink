import fs from 'fs';
let content = fs.readFileSync('src/pages/link4/Link4Page.tsx', 'utf8');

content = content.replace('  }, [activeSegmentId, allMatchups, user]);', '  }, [activeSegmentId, allMatchups, fallbackMatchups, user]);');

fs.writeFileSync('src/pages/link4/Link4Page.tsx', content);
