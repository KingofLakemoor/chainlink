const fs = require('fs');
let code = fs.readFileSync('src/pages/onboarding/OnboardingPage.tsx', 'utf8');

code = code.replace(
`              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
              placeholder="e.g. chainmaster99"
              required
            />`,
`              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
              placeholder="e.g. chainmaster99"
              required
              minLength={3}
              maxLength={20}
            />`
);

fs.writeFileSync('src/pages/onboarding/OnboardingPage.tsx', code);
