import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// The line is now: <NavItem icon={Grid} label="Link4" path="/link4" showBadge={hasActiveLink4} isShimmer={hasActiveLink4} />
content = content.replace(
  '<NavItem icon={Grid} label="Link4" path="/link4" showBadge={hasActiveLink4} isShimmer={hasActiveLink4} />',
  '{hasActiveLink4 && <NavItem icon={Grid} label="Link4" path="/link4" showBadge={true} isShimmer={true} />}'
);

fs.writeFileSync('src/App.tsx', content);
