import fs from 'fs';

let content = fs.readFileSync('src/pages/pickem/PickEmLandingPage.tsx', 'utf-8');

// Add useSearchParams to import
content = content.replace(
  "import { useNavigate } from 'react-router-dom';",
  "import { useNavigate, useSearchParams } from 'react-router-dom';"
);

// Add searchParams hook
content = content.replace(
  "const navigate = useNavigate();",
  "const navigate = useNavigate();\n  const [searchParams, setSearchParams] = useSearchParams();"
);

// In useEffect, get code from search params
const targetEffect = `  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;`;
      
const replacementEffect = `  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      const urlCode = searchParams.get('joinCode') || searchParams.get('code');
      if (urlCode && activeTab !== 'join') {
        setActiveTab('join');
        setJoinCode(urlCode);
      }`;

content = content.replace(targetEffect, replacementEffect);
fs.writeFileSync('src/pages/pickem/PickEmLandingPage.tsx', content);
