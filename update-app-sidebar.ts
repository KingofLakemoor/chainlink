import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

// 1. Remove "My Profile" from Sidebar
content = content.replace(
  '<NavItem icon={UserIcon} label="My Profile" path="/profile" />',
  ''
);

// 2. Remove "My Stats" from Sidebar
content = content.replace(
  '<NavItem icon={CheckCircle2} label="My Stats" path="/mypicks" />\n',
  ''
);

// 3. Make Link4 shimmer when active
content = content.replace(
  '<NavItem icon={Grid} label="Link4" path="/link4" showBadge={hasActiveLink4} />',
  '<NavItem icon={Grid} label="Link4" path="/link4" showBadge={hasActiveLink4} isShimmer={hasActiveLink4} />'
);

// We need to add isShimmer to NavItem props
content = content.replace(
  'const NavItem = ({ icon: Icon, label, path, showBadge = false }: { icon: any, label: string, path: string, showBadge?: boolean }) => {',
  'const NavItem = ({ icon: Icon, label, path, showBadge = false, isShimmer = false }: { icon: any, label: string, path: string, showBadge?: boolean, isShimmer?: boolean }) => {'
);
content = content.replace(
  '<span className="text-sm">{label}</span>',
  '<span className={`text-sm ${isShimmer ? "animate-pulse text-[#22c55e] font-bold drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" : ""}`}>{label}</span>'
);

fs.writeFileSync('src/App.tsx', content);
