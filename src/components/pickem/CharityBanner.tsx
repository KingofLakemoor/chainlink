import React from 'react';
import { ExternalLink, Heart, Trophy, Calendar, Gift, CheckCircle } from 'lucide-react';
import { CharityProgressTracker } from './CharityProgressTracker';

export function CharityBanner() {


  return (
    <div className="bg-gradient-to-br from-purple-900/40 via-[#121212] to-yellow-900/20 border border-purple-500/30 rounded-xl p-6 md:p-8 shadow-lg relative overflow-hidden mb-12">
      <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none mix-blend-overlay" style={{ background: 'radial-gradient(circle at top left, rgba(147,51,234,0.3) 0%, transparent 70%)' }}></div>
      
      <div className="relative z-10">
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Left Column: Pick Em & Club 602 */}
          <div className="flex-1 space-y-6">
            <h3 className="text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-md">
              🌟 Club 602 Boosts Our Pick 'Em Challenge for YES Day Walk for Autism!
            </h3>
            
            <div className="space-y-4 text-zinc-300 text-sm md:text-base leading-relaxed">
              <p>
                I am thrilled to announce that <strong>Club 602</strong> is partnering with us once again to support our ongoing fundraising efforts. To ensure the biggest impact possible, <strong>Club 602 is fully funding this year's Pick 'Em prize pool</strong>.
              </p>
              <p>
                By covering the prize pot, they are guaranteeing that <strong>100% of your donations</strong> go directly to nonprofit autism organizations throughout the state, providing critical support and services.
              </p>
            </div>

            {/* PROGRESS BARS */}
            <CharityProgressTracker />

            <div className="bg-black/40 border border-purple-500/20 rounded-xl p-5 md:p-6">
              <h4 className="text-lg font-bold text-white border-b border-white/10 pb-2 mb-4">Entry & Match Details</h4>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-pink-400 shrink-0 mt-0.5" />
                  <p className="text-zinc-300 text-sm leading-relaxed"><strong className="text-white">Entry Requirement:</strong> A minimum donation of $25 enters you into the challenge.</p>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-zinc-300 text-sm leading-relaxed"><strong className="text-white">Early Bird Boost:</strong> Get your entry in by August 30th, and Club 602 will add $15 to the prize pot!</p>
                </li>
                <li className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-zinc-300 text-sm leading-relaxed"><strong className="text-white">Kickoff Boost:</strong> Enter between August 31st and kickoff on Sept 9th, and they will add $10 to the pot!</p>
                </li>
                <li className="flex items-start gap-3">
                  <Gift className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  <p className="text-zinc-300 text-sm leading-relaxed"><strong className="text-white">Bonus:</strong> The Pick 'Em champion will take home a 602 West Neon Tee, plus an exclusive Yes Day 2026 cosmetics pack on ChainLink and ScriptLess.</p>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: YES Day Info */}
          <div className="flex-1 space-y-6">
            <div className="bg-[#18181B]/80 border border-yellow-500/20 rounded-xl p-5 md:p-6 h-full flex flex-col justify-center">
              
              <div className="flex justify-center mb-6">
                 <img src="/images/yes-day-logo.png" alt="YES Day Walk for Autism" className="h-32 object-contain drop-shadow-md" />
              </div>

              <h4 className="text-lg font-bold text-white mb-3 text-yellow-400">About YES Day Walk for Autism</h4>
              <p className="text-zinc-300 text-sm leading-relaxed mb-4">
                Southwest Autism Research & Resource Center (SARRC) is excited to celebrate the sixth annual YES Day Walk for Autism with our supportive community on <strong>Sunday, Oct. 25 at Tempe Beach Park!</strong>
              </p>
              
              <h5 className="text-sm font-bold text-white mb-2 mt-4">When You Say "YES," You're Saying:</h5>
              <ul className="space-y-2 mb-4">
                {[
                  "listening to and understanding people with autism.",
                  "early screening, diagnosis, and access to effective services.",
                  "high-quality education and healthcare.",
                  "training for first responders.",
                  "supporting employment opportunities for adults with autism.",
                  "innovative housing solutions.",
                  "building more supportive, inclusive communities across Arizona."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                    <CheckCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <span><strong>YES!</strong> to {item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-purple-500/30 pt-6">
          <p className="text-white font-medium text-center mb-6 text-lg italic max-w-2xl mx-auto">
            Lock in your picks, support a vital cause, and let’s build the biggest pot yet!
          </p>

          <div className="flex justify-center">
            <a href="http://act.autismcenter.org/goto/ashweaver" target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-lg text-lg font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 bg-purple-600 text-white hover:bg-purple-500 h-14 px-10 gap-3 shadow-[0_0_20px_rgba(147,51,234,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]">
              Donate to Ashley's YES Day Page <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
