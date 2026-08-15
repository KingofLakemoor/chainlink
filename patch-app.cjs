const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove loginWithDiscord import
code = code.replace(/, loginWithDiscord/, '');

// Remove the text about discord in the warning
code = code.replace(/to use Google\/Discord sign-in/, 'to use Google sign-in');

// Remove the Discord login button
const startMarker = '<Button\\s+variant="outline"\\s+size="lg"\\s+className="w-full h-12 border-\\[#3f3f46\\] hover:bg-zinc-800/50 flex items-center justify-center gap-2 mt-3"\\s+disabled=\\{isLoading\\}\\s+onClick=\\{async \\(\\) => \\{\\s+if \\(referrerId\\) \\{\\s+\/\/ Store in local storage temporarily before redirect\\s+localStorage\\.setItem\\(\'chainlink_referrer_id\', referrerId\\);\\s+\\}\\s+setError\\(\'\'\\);\\s+setIsLoading\\(true\\);\\s+try \\{\\s+await loginWithDiscord\\(\\);\\s+\\} catch \\(e: any\\) \\{\\s+setError\\(e\\.message \\|\\| \'An error occurred during Discord sign in\\.\'\\);\\s+setIsLoading\\(false\\);\\s+\\}\\s+\\}\\}\\s+>\\s+<FaDiscord className="w-5 h-5 text-\\[#5865F2\\]" \\/>\\s+Continue with Discord\\s+</Button>';

const regex = new RegExp(startMarker, 'g');
code = code.replace(regex, '');

fs.writeFileSync('src/App.tsx', code);
