const fs = require('fs');
let code = fs.readFileSync('src/pages/pickem/PickEmPage.tsx', 'utf-8');

const gamesBeginUI = `
      {selectedCampaign?.gamesBeginDate && Date.now() < selectedCampaign.gamesBeginDate && (
        <div className="bg-[#18181A] border border-zinc-800 rounded-xl p-6 mb-8 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Games Begin Soon!</h2>
          <p className="text-zinc-400">The first games for this campaign begin on {new Date(selectedCampaign.gamesBeginDate).toLocaleDateString()}. Get your picks in early!</p>
        </div>
      )}
`;

code = code.replace(
  "{/* Main Tabs */}",
  gamesBeginUI + "\n      {/* Main Tabs */}"
);

fs.writeFileSync('src/pages/pickem/PickEmPage.tsx', code);
