const fs = require('fs');
let code = fs.readFileSync('src/pages/shop/ShopPage.tsx', 'utf8');

const newPortalFunction = `
  const handleManageSubscription = async () => {
    if (!user) return;
    setBuyLoading('portal');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${idToken}\`
        }
      });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create portal session");
      }
    } catch (e: any) {
      console.error(e);
      setMessage({ text: e.message || "Failed to connect to billing portal.", type: 'error' });
    } finally {
      setBuyLoading(null);
    }
  };
`;

code = code.replace(
/const handleStripeCheckout = async/,
newPortalFunction + "\n  const handleStripeCheckout = async"
);

code = code.replace(
/\{profile\?\.premium \? \(\s*<div className="bg-\[\#18181A\] border border-purple-500\/50 rounded-xl p-8 relative overflow-hidden flex flex-col items-center justify-center text-center h-full">[\s\S]*?<\/div>\s*\) : \(/,
`{profile?.premium ? (
              <div className="bg-[#18181A] border border-purple-500/50 rounded-xl p-8 relative overflow-hidden flex flex-col items-center justify-center text-center h-full">
                <div className="absolute -z-10 h-full w-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900/20 via-[#18181A]/0 to-[#18181A]/0"></div>
                <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-4">
                  <Crown className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-display">Pro Member</h3>
                <p className="text-zinc-400 mb-6 text-sm">
                  You are currently enjoying all the benefits of ChainLink Pro.
                </p>
                <Button 
                  className="w-full bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                  onClick={handleManageSubscription}
                  disabled={buyLoading === 'portal'}
                >
                  {buyLoading === 'portal' ? 'Loading...' : 'Manage Subscription'}
                </Button>
              </div>
            ) : (`
);

fs.writeFileSync('src/pages/shop/ShopPage.tsx', code);
