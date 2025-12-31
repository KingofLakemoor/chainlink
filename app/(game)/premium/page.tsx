"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Star, Crown, Zap } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { RainbowButton } from "@/components/ui/rainbow-button";

export default function PremiumPage() {
  const benefits = [
    {
      title: "Daily Free Spins",
      description: "Get a free spin on the slot machine every 24 hours.",
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
    },
    {
      title: "Exclusive Reactions",
      description: "Unlock premium reactions to use in matchups and chat.",
      icon: <Star className="w-6 h-6 text-purple-400" />,
    },
    {
      title: "Ad-Free Experience",
      description: "Browse and play without any interruptions.",
      icon: <Check className="w-6 h-6 text-green-400" />,
    },
    {
      title: "Badge & flair",
      description: "Stand out with a special premium badge next to your name.",
      icon: <Crown className="w-6 h-6 text-orange-400" />,
    },
  ];

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600">
          Upgrade to Premium
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Take your gaming experience to the next level with exclusive perks and daily rewards.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:gap-12 items-start">
        {/* Benefits List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">What's Included</h2>
          <div className="grid gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4 p-4 rounded-lg bg-card border shadow-sm"
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-semibold">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {benefit.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Pricing Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-8 border-2 border-primary/20 bg-gradient-to-b from-background to-primary/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Best Value
              </span>
            </div>

            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold mb-2">Premium Membership</h3>
              <div className="flex justify-center items-baseline gap-1">
                <span className="text-5xl font-extrabold">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Cancel anytime. No hidden fees.
              </p>
            </div>

            <div className="space-y-4">
              <RainbowButton className="w-full text-lg h-12">
                Get Premium Now
              </RainbowButton>
              <p className="text-xs text-center text-muted-foreground">
                By subscribing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
