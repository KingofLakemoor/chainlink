import React from 'react';
import { HelpCircle, Info, BookOpen, Target, Link2, HelpCircle as FaqIcon, ShieldAlert, Crown } from 'lucide-react';

export function HelpPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#22c55e]/10 mb-4 border border-[#22c55e]/20">
          <HelpCircle className="w-8 h-8 text-[#22c55e]" />
        </div>
        <h1 className="text-4xl font-bold text-zinc-100 font-display mb-2">Help Center & How to Play</h1>
        <p className="text-zinc-400 text-lg">Everything you need to know about playing ChainLink.</p>
      </div>

      <div className="space-y-12">
        {/* How to Play */}
        <section className="bg-[#121212] border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Info className="w-6 h-6 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">How to Play ChainLink</h2>
          </div>
          <div className="space-y-4 text-zinc-300 relative z-10">
            <p>
              <strong>ChainLink</strong> is a continuous sports prediction game where the goal is to build the longest winning streak (your "Chain") by making consecutive correct picks.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Make a Pick:</strong> Browse available matchups on the Dashboard and pick a team to win.</li>
              <li><strong>Build Your Chain:</strong> Every correct pick adds +1 to your current Chain.</li>
              <li><strong>Break the Chain:</strong> A single incorrect pick resets your Chain back to 0. (Pushes/Ties do not break your chain, but do not increase it).</li>
              <li><strong>Earn Links:</strong> As you make picks, you earn <strong>Links</strong> (the in-game currency), which can be used to buy items in the Shop.</li>
              <li><strong>Climb the Leaderboards:</strong> Compete with other users globally to have the longest Chain and the most wins.</li>
            </ul>
          </div>
        </section>

        {/* ChainLink Pro */}
        <section className="bg-[#121212] border border-purple-500/30 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-transparent pointer-events-none"></div>
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Crown className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">ChainLink Pro Benefits</h2>
          </div>
          <div className="space-y-4 text-zinc-300 relative z-10">
            <p>
              <strong>ChainLink Pro</strong> is our premium subscription that offers exclusive perks, deeper stats, and enhances your overall experience.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Daily Links:</strong> Claim 10 bonus Links every single day in the Shop.</li>
              <li><strong>Future Pick Queuing:</strong> Premium members can queue up future picks in advance, automatically locking them in when the previous pick resolves.</li>
              <li><strong>Advanced Metrics:</strong> Unlock the "Advanced Metrics" page to view detailed win/loss/push records by sport, view your all-time pick history, and track achievement medal distribution.</li>
              <li><strong>Exclusive Shop Items:</strong> Get access to purchase Pro-only premium cosmetics, banners, and rings in the Shop.</li>
              <li><strong>Monthly Pro Set:</strong> Receive a special Pro Only cosmetic set every month.</li>
              <li><strong><a href="https://scriptless.club602.com/premium" target="_blank" rel="noopener noreferrer" className="underline hover:text-purple-300">ScriptLess Premium</a>:</strong> Enjoy full complimentary access to ScriptLess Premium, our sister site for Fantasy Reality TV predictions.</li>
            </ul>
          </div>
        </section>

        {/* Link4 Feature */}
        <section className="bg-[#121212] border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Link2 className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Link4</h2>
          </div>
          <div className="space-y-4 text-zinc-300 relative z-10">
            <p>
              <strong>Link4</strong> is a special game mode where you must correctly predict 4 matchups in a row within a specific "Segment" (time period) to win a share of a prize pot.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Entry Fee:</strong> Entering a Link4 segment usually requires spending Links.</li>
              <li><strong>4 Picks:</strong> You must select exactly 4 different matchups.</li>
              <li><strong>Moneyline Scoring:</strong> Your score in Link4 is determined by the Moneyline (ML) odds of your picks. Positive odds add to your score, negative odds subtract from it. (e.g., +150 adds 150 points, -110 subtracts 110 points).</li>
              <li><strong>Elimination:</strong> A single wrong pick eliminates you from the current Link4 segment.</li>
              <li><strong>Winning:</strong> The user(s) who successfully win all 4 picks and have the highest total score at the end of the segment win the prize pool!</li>
            </ul>
          </div>
        </section>

        {/* Pick'em Feature */}
        <section className="bg-[#121212] border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Target className="w-6 h-6 text-orange-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Pick'em Campaigns</h2>
          </div>
          <div className="space-y-4 text-zinc-300 relative z-10">
            <p>
              <strong>Pick'em</strong> campaigns are special, standalone prediction contests often centered around a specific sport, season, or event (e.g., NFL Season, March Madness).
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Campaigns have their own separate leaderboards and do not affect your main Chain.</li>
              <li>They may involve picking winners for a slate of games, answering prop questions, or making over/under predictions.</li>
              <li>Look out for special prizes for winning Pick'em campaigns!</li>
            </ul>
          </div>
        </section>

        {/* Glossary */}
        <section className="bg-[#121212] border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <BookOpen className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Glossary of Terms</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-zinc-300 relative z-10">
            <div className="space-y-2 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
              <strong className="text-emerald-400">Moneyline (ML)</strong>
              <p className="text-sm">A straight-up bet on which team will win the game outright, regardless of the point spread. Odds are indicated by a + or - sign.</p>
            </div>
            <div className="space-y-2 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
              <strong className="text-emerald-400">Spread (ATS)</strong>
              <p className="text-sm">"Against the Spread". A predicted scoring margin. The favorite is given a negative spread (e.g., -5.5), meaning they must win by 6 or more points. The underdog is given a positive spread (+5.5), meaning they can lose by up to 5 points or win outright.</p>
            </div>
            <div className="space-y-2 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
              <strong className="text-emerald-400">Over/Under (O/U)</strong>
              <p className="text-sm">A prediction on whether the combined score of both teams will be higher (Over) or lower (Under) than a set number.</p>
            </div>
            <div className="space-y-2 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
              <strong className="text-emerald-400">Links</strong>
              <p className="text-sm">The primary virtual currency of ChainLink. Earned through play, completing challenges, or referrals. Used to purchase cosmetics, power-ups, or enter premium game modes.</p>
            </div>
            <div className="space-y-2 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
              <strong className="text-emerald-400">Push</strong>
              <p className="text-sm">A tie. In spread or O/U betting, if the final score exactly matches the predicted number, the pick is a "push". It neither adds to nor breaks your Chain.</p>
            </div>
             <div className="space-y-2 bg-zinc-900/50 p-4 rounded-lg border border-zinc-800/50">
              <strong className="text-emerald-400">Chain</strong>
              <p className="text-sm">Your current active streak of consecutive correct picks. Resets to 0 upon a single loss.</p>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-[#121212] border border-zinc-800 rounded-xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <FaqIcon className="w-6 h-6 text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-zinc-100">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-6 text-zinc-300 relative z-10">
            <div className="space-y-2">
              <h3 className="font-bold text-white text-lg">What happens if a game is canceled or postponed?</h3>
              <p>If a game is canceled or officially postponed, any picks made on that game will be marked as a 'Push' (or canceled). Your chain will remain unaffected, and you will not lose your streak.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white text-lg">How often are new matchups added?</h3>
              <p>Matchups are synced automatically from live sports data providers several times a day. You'll typically see games available a few days in advance.</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-white text-lg">Can I change my pick after making it?</h3>
              <p>Currently, once a pick is submitted, it is locked in. Make sure to review your selections carefully before confirming!</p>
            </div>
             <div className="space-y-2">
              <h3 className="font-bold text-white text-lg">How do I get more Links?</h3>
              <p>You can earn links by winning picks, completing achievements, claiming your daily Pro links in the Shop, or referring friends using your unique referral code found on your Profile page.</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}

export default HelpPage;
