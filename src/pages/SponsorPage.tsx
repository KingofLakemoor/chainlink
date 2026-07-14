import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Link2, ArrowLeft, Mail, Star, Shield, Trophy } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SponsorPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-50 flex flex-col font-sans selection:bg-[#22c55e]/30 selection:text-white">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#22c55e]/10 rounded-[100%] blur-[120px] opacity-50" />
      </div>

      {/* Header */}
      <header className="h-20 border-b border-[#27272a] bg-[#121212]/80 backdrop-blur-xl flex items-center px-6 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Link2 className="w-6 h-6 text-[#22c55e]" />
            <span className="font-bold text-xl font-display text-zinc-100 tracking-tight">ChainLink</span>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-zinc-400 hover:text-zinc-200">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to App
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-16 md:py-24 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-zinc-100 mb-6 font-display tracking-tight">
            Partner with <span className="text-[#22c55e]">ChainLink</span>
          </h1>
          <p className="text-xl text-zinc-400 leading-relaxed mb-8">
            Engage your community through innovative gaming experiences. ChainLink & Your Brand, growing together.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="mailto:info@club602.com">
              <Button size="lg" className="h-14 px-8 text-lg font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                <Mail className="w-5 h-5 mr-2" /> Apply Now
              </Button>
            </a>
          </div>
        </div>

        {/* Intro Text */}
        <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-8 md:p-12 mb-20 shadow-xl max-w-4xl mx-auto">
          <div className="space-y-6 text-lg text-zinc-300 leading-relaxed">
            <p>
              Here at ChainLink, we believe that community drives everything we do. It is for that reason that we wanted to ensure that everyone would have a chance to make ChainLink part of their own circles by allowing even the smallest content creators and group leaders to utilize our in-game opportunities to engage with their followers.
            </p>
            <p>
              From the Squads team game to featured matchups, ChainLink can become a part of blogs, podcasts, business outreach, and social clubs everywhere. Starting at the low price of <strong className="text-[#22c55e]">FREE</strong>, we will work with you to find the best way to engage your target audience.
            </p>
          </div>
        </div>

        {/* Sponsorship Levels */}
        <div className="mb-24">
          <h2 className="text-3xl font-bold text-center text-zinc-100 mb-12 font-display">Sponsorship Levels</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">

            {/* Associate */}
            <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-8 flex flex-col hover:border-[#22c55e]/50 transition-colors">
              <div className="mb-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Star className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-100 mb-2">Associate</h3>
                <p className="text-zinc-400 font-medium">Free</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-zinc-300">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>Share us with your community</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>Highlighted matchups</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  <span>Logo on sponsors page</span>
                </li>
              </ul>
            </div>

            {/* Sponsor */}
            <div className="bg-[#112316] border-2 border-[#22c55e]/50 rounded-2xl p-8 flex flex-col relative transform md:-translate-y-4 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#22c55e] text-zinc-950 text-xs font-bold uppercase tracking-wider py-1 px-4 rounded-full">
                Most Popular
              </div>
              <div className="mb-6">
                <div className="w-12 h-12 bg-[#22c55e]/10 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-[#22c55e]" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-100 mb-2">Sponsor</h3>
                <p className="text-[#22c55e] font-medium">$10 / month</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-zinc-300">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                  <span>Highlighted matchups</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                  <span>Logo on sponsors page</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                  <span>Social media mentions</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                  <span>Exclusive merchandise</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#22c55e] shrink-0" />
                  <span>Special in-app flair</span>
                </li>
              </ul>
            </div>

            {/* Partner */}
            <div className="bg-[#121212] border border-[#27272a] rounded-2xl p-8 flex flex-col hover:border-yellow-500/50 transition-colors">
              <div className="mb-6">
                <div className="w-12 h-12 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-4">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                </div>
                <h3 className="text-2xl font-bold text-zinc-100 mb-2">Partner</h3>
                <p className="text-zinc-400 font-medium">Contact for info</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1 text-zinc-300">
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                  <span>Logo on main page</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                  <span>Dedicated blog post</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                  <span>Social media shoutouts</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                  <span>Exclusive merchandise</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                  <span>Access to analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
                  <span>Special in-app flair</span>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Process */}
        <div className="mb-24 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-zinc-100 mb-12 font-display">Application Process</h2>
          <div className="grid gap-6 md:grid-cols-1">
            {[
              "Email us at Info@Club602.com",
              "Review of application by the sponsorship team",
              "Contract negotiation and agreement",
              "Payment processing",
              "Onboarding and sponsor benefits activation"
            ].map((step, index) => (
              <div key={index} className="flex items-center gap-6 bg-[#121212] border border-[#27272a] rounded-xl p-6">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#3f3f46] flex items-center justify-center text-xl font-bold text-[#22c55e]">
                  {index + 1}
                </div>
                <p className="text-lg text-zinc-200">{step}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-[#121212] to-[#161d2b] border border-[#27272a] rounded-2xl p-12 max-w-4xl mx-auto relative overflow-hidden">
          <div className="absolute inset-0 bg-[#22c55e]/5 opacity-50"></div>
          <div className="relative z-10">
            <h2 className="text-3xl font-bold text-zinc-100 mb-4 font-display">Ready to partner with ChainLink?</h2>
            <p className="text-zinc-400 mb-8 text-lg">Get in touch with us today for further inquiries.</p>
            <a href="mailto:info@club602.com">
              <Button size="lg" className="h-14 px-8 text-lg font-bold shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                <Mail className="w-5 h-5 mr-2" /> info@club602.com
              </Button>
            </a>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-[#27272a] py-8 text-center text-zinc-500 mt-auto">
        <p>&copy; {new Date().getFullYear()} ChainLink. All rights reserved.</p>
      </footer>
    </div>
  );
}
