import fs from 'fs';

let content = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf-8');

content = content.replace(
  "import { CharityBanner } from '../../components/pickem/CharityBanner';", 
  "import { CharityBanner } from '../../components/pickem/CharityBanner';\nimport { CharityProgressTracker } from '../../components/pickem/CharityProgressTracker';"
);

const targetContent = `      {selectedCampaign && isParticipant && (
        <>
      
      {isEliminated && selectedCampaign?.format === 'SURVIVOR' && (`

const replacementContent = `      {selectedCampaign && isParticipant && (
        <>
          {selectedCampaign.name === 'YES Day Walk for Autism 2026' && (
            <div className="w-full mb-8">
              <CharityProgressTracker />
            </div>
          )}
      {isEliminated && selectedCampaign?.format === 'SURVIVOR' && (`

content = content.replace(targetContent, replacementContent);
fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', content);
