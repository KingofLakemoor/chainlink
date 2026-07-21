import fs from 'fs';
let content = fs.readFileSync('src/components/SidebarProgress.tsx', 'utf8');

const targetState = `  const [prizeData, setPrizeData] = useState({
    activeUsersRequirement: 25,
    picksRequirement: 375,
    prizeDescription: '$5 Club 602 gift card',
    sponsorName: 'Club 602',
    targetMonth: '',
    winCondition: 'Current Chain'
  });

  const [activeUsers, setActiveUsers] = useState(0);
  const [globalPicks, setGlobalPicks] = useState(0);`;

const replacementState = `  const [prizeData, setPrizeData] = useState({
    activeUsersRequirement: 25,
    picksRequirement: 375,
    referralsRequirement: 10,
    prizeDescription: '$5 Club 602 gift card',
    sponsorName: 'Club 602',
    targetMonth: '',
    winCondition: 'Current Chain'
  });

  const [activeUsers, setActiveUsers] = useState(0);
  const [globalPicks, setGlobalPicks] = useState(0);
  const [globalReferrals, setGlobalReferrals] = useState(0);`;

content = content.replace(targetState, replacementState);
fs.writeFileSync('src/components/SidebarProgress.tsx', content);
console.log("Patched sidebar state");
