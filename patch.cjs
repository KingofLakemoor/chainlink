const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Password minLength
code = code.replace(
`                placeholder="••••••••"
                required
              />`,
`                placeholder="••••••••"
                required
                minLength={6}
              />`
);

// Username sanitization and lengths
code = code.replace(
`                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
                  placeholder="cooluser123"
                  required={isSignUp}
                />`,
`                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                  className="w-full bg-[#1a1a1a] border border-[#3f3f46] rounded-lg px-4 py-2.5 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 focus:border-[#22c55e]"
                  placeholder="cooluser123"
                  required={isSignUp}
                  minLength={3}
                  maxLength={20}
                />`
);

// Google OAuth Loading
code = code.replace(
`            onClick={async () => {
              if (referrerId) {
                // Store in local storage temporarily before redirect
                localStorage.setItem('chainlink_referrer_id', referrerId);
              }
              try {
                await loginWithGoogle();
              } catch (e: any) {
                setError(e.message || 'An error occurred during Google sign in.');
              }
            }}`,
`            disabled={isLoading}
            onClick={async () => {
              if (referrerId) {
                // Store in local storage temporarily before redirect
                localStorage.setItem('chainlink_referrer_id', referrerId);
              }
              setError('');
              setIsLoading(true);
              try {
                await loginWithGoogle();
              } catch (e: any) {
                setError(e.message || 'An error occurred during Google sign in.');
                setIsLoading(false);
              }
            }}`
);

// Discord OAuth Loading
code = code.replace(
`            onClick={async () => {
              if (referrerId) {
                // Store in local storage temporarily before redirect
                localStorage.setItem('chainlink_referrer_id', referrerId);
              }
              try {
                await loginWithDiscord();
              } catch (e: any) {
                setError(e.message || 'An error occurred during Discord sign in.');
              }
            }}`,
`            disabled={isLoading}
            onClick={async () => {
              if (referrerId) {
                // Store in local storage temporarily before redirect
                localStorage.setItem('chainlink_referrer_id', referrerId);
              }
              setError('');
              setIsLoading(true);
              try {
                await loginWithDiscord();
              } catch (e: any) {
                setError(e.message || 'An error occurred during Discord sign in.');
                setIsLoading(false);
              }
            }}`
);

fs.writeFileSync('src/App.tsx', code);
