"use client";

import React, { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PartyPopper, Rocket, Star, Trophy, Zap, ArrowRight, Users } from "lucide-react";
import confetti from "canvas-confetti";

interface OnboardingCompleteAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName: string;
  completedSteps?: number;
  onGoToDashboard?: () => void;
}

export default function OnboardingCompleteAnimation({
  isOpen,
  onClose,
  employeeName,
  completedSteps,
  onGoToDashboard,
}: OnboardingCompleteAnimationProps) {
  const [showSecondWave, setShowSecondWave] = useState(false);

  const fireConfetti = useCallback(() => {
    // Epic celebration colors - gold, green, blue
    const colors = ["#fbbf24", "#f59e0b", "#22c55e", "#10b981", "#3b82f6", "#6366f1"];
    
    // Initial big burst
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
      ticks: 300,
      zIndex: 9999,
    });

    // Side cannons
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.8 },
        colors,
        startVelocity: 40,
        zIndex: 9999,
      });
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.8 },
        colors,
        startVelocity: 40,
        zIndex: 9999,
      });
    }, 250);

    // Second wave from top
    setTimeout(() => {
      confetti({
        particleCount: 80,
        spread: 120,
        origin: { y: 0, x: 0.5 },
        colors,
        startVelocity: 25,
        gravity: 1.5,
        ticks: 200,
        zIndex: 9999,
      });
    }, 600);

    // Star shower
    setTimeout(() => {
      const starColors = ["#fbbf24", "#fcd34d", "#fef3c7"];
      confetti({
        particleCount: 30,
        spread: 180,
        origin: { y: 0.2 },
        colors: starColors,
        shapes: ["star"],
        startVelocity: 20,
        scalar: 1.5,
        gravity: 0.5,
        ticks: 400,
        zIndex: 9999,
      });
    }, 1000);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fireConfetti();
      
      // Show second wave animation after initial celebration
      const waveTimer = setTimeout(() => setShowSecondWave(true), 800);
      
      return () => {
        clearTimeout(waveTimer);
      };
    } else {
      setShowSecondWave(false);
    }
  }, [isOpen, fireConfetti]);

  if (!isOpen) return null;

  const firstName = employeeName.split(" ")[0];

  // Achievement badges
  const achievements = [
    { icon: Star, label: "All steps complete", color: "text-amber-500" },
    { icon: Zap, label: "Ready to go", color: "text-blue-500" },
    { icon: Users, label: "Part of the team", color: "text-emerald-500" },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
        onClick={onClose}
      >
        {/* Epic gradient backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-amber-900/40 via-emerald-900/50 to-blue-900/40 backdrop-blur-md"
        />

        {/* Animated background rays */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 0.1, scale: 2 }}
              transition={{ delay: 0.3 + i * 0.1, duration: 1.5 }}
              className="absolute top-1/2 left-1/2 w-32 h-[200%] bg-gradient-to-t from-amber-400/20 to-transparent origin-bottom"
              style={{
                transform: `translateX(-50%) translateY(-100%) rotate(${i * 45}deg)`,
              }}
            />
          ))}
        </div>

        {/* Floating celebration icons */}
        <motion.div
          animate={{
            y: [0, -15, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[15%] left-[12%]"
        >
          <PartyPopper className="w-12 h-12 text-amber-400/50" />
        </motion.div>
        
        <motion.div
          animate={{
            y: [0, 20, 0],
            rotate: [0, -15, 15, 0],
          }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
          className="absolute top-[20%] right-[15%]"
        >
          <Trophy className="w-10 h-10 text-amber-300/40" />
        </motion.div>

        <motion.div
          animate={{ y: [0, -25, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[25%] right-[10%]"
        >
          <Rocket className="w-14 h-14 text-blue-400/40 rotate-45" />
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0, y: 60 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 250, damping: 22 }}
          className="relative w-full max-w-lg mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative rounded-[2rem] bg-white/95 dark:bg-slate-900/95 shadow-[0_40px_80px_-20px_rgba(251,191,36,0.4)] backdrop-blur-xl border border-white/20 dark:border-amber-500/20 overflow-hidden">
            {/* Celebration header bar */}
            <motion.div
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="h-2 bg-gradient-to-r from-amber-400 via-emerald-400 to-blue-400 bg-[length:200%_100%]"
            />

            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-br from-amber-200/30 to-emerald-100/20 dark:from-amber-700/20 dark:to-emerald-800/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-56 h-56 bg-gradient-to-tr from-blue-200/30 to-amber-100/20 dark:from-blue-700/20 dark:to-amber-800/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

            <div className="relative px-8 py-12 text-center">
              {/* Animated trophy/celebration icon */}
              <motion.div
                initial={{ scale: 0, y: 30 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 12 }}
                className="relative mx-auto mb-8 inline-block"
              >
                <motion.div
                  animate={{ rotate: [0, -3, 3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="w-28 h-28 rounded-[1.75rem] bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center shadow-2xl shadow-amber-500/40"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <Trophy className="w-14 h-14 text-white" strokeWidth={1.5} />
                  </motion.div>
                </motion.div>
                
                {/* Sparkle ring */}
                <motion.div
                  animate={{ 
                    rotate: 360,
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ 
                    rotate: { duration: 20, repeat: Infinity, ease: "linear" },
                    scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                  }}
                  className="absolute -inset-3 rounded-[2rem] border-2 border-dashed border-amber-300/40"
                />

                {/* Floating stars around icon */}
                {[0, 72, 144, 216, 288].map((angle, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.7 + i * 0.1 }}
                    className="absolute w-4 h-4"
                    style={{
                      top: `${50 + 55 * Math.sin((angle * Math.PI) / 180)}%`,
                      left: `${50 + 55 * Math.cos((angle * Math.PI) / 180)}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <Star className="w-full h-full text-amber-400 fill-amber-400" />
                  </motion.div>
                ))}
              </motion.div>

              {/* Big celebration text */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-emerald-600 to-blue-600 dark:from-amber-400 dark:via-emerald-400 dark:to-blue-400 mb-3">
                  Welcome Aboard!
                </h2>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-slate-700 dark:text-slate-200 mb-2"
              >
                Congratulations, <span className="font-bold">{firstName}</span>! 🎉
              </motion.p>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-slate-500 dark:text-slate-400 mb-8"
              >
                You&apos;ve completed all your onboarding tasks. You&apos;re officially ready to start your journey with us!
              </motion.p>

              {/* Achievement badges */}
              {showSecondWave && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex justify-center gap-4 mb-8"
                >
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.label}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: index * 0.15, type: "spring" }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2 shadow-sm">
                        <achievement.icon className={`w-6 h-6 ${achievement.color}`} />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-[80px]">
                        {achievement.label}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {/* Stats */}
              {completedSteps && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-8"
                >
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: "spring" }}
                  >
                    ✓
                  </motion.span>
                  {completedSteps} tasks completed
                </motion.div>
              )}

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 px-6 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    onGoToDashboard?.();
                    onClose();
                  }}
                  className="flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-emerald-500 to-blue-500 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  Go to Dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}



