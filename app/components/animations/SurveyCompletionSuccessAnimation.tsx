"use client";

import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MessageSquare, Heart, Sparkles, Star } from "lucide-react";
import confetti from "canvas-confetti";

interface SurveyCompletionSuccessAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  surveyName: string;
  questionCount?: number;
}

export default function SurveyCompletionSuccessAnimation({
  isOpen,
  onClose,
  surveyName,
  questionCount,
}: SurveyCompletionSuccessAnimationProps) {
  const fireConfetti = useCallback(() => {
    // Purple/pink celebration theme
    const colors = ["#a855f7", "#c084fc", "#e879f9", "#f472b6", "#818cf8", "#6366f1"];
    
    // Starburst pattern
    const end = Date.now() + 1500;
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors,
        zIndex: 9999,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Center burst
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.55 },
        colors,
        startVelocity: 35,
        zIndex: 9999,
      });
    }, 300);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fireConfetti();
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fireConfetti, onClose]);

  if (!isOpen) return null;

  // Floating stars configuration
  const floatingStars = [
    { top: "15%", left: "10%", delay: 0, size: 20 },
    { top: "25%", right: "15%", delay: 0.3, size: 16 },
    { bottom: "30%", left: "8%", delay: 0.6, size: 14 },
    { top: "40%", right: "8%", delay: 0.9, size: 18 },
    { bottom: "20%", right: "20%", delay: 1.2, size: 12 },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Beautiful gradient backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-indigo-900/60 to-fuchsia-900/50 backdrop-blur-md"
        />

        {/* Floating star decorations */}
        {floatingStars.map((star, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0.8, 1],
              scale: [0, 1, 0.9, 1],
              rotate: [0, 180, 360],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: star.delay,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              top: star.top,
              left: star.left,
              right: star.right,
              bottom: star.bottom,
            }}
            className="text-purple-300/40"
          >
            <Star className="fill-current" style={{ width: star.size, height: star.size }} />
          </motion.div>
        ))}

        {/* Main card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="relative w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-[0_32px_64px_-16px_rgba(168,85,247,0.4)] backdrop-blur-xl border border-white/20 dark:border-purple-500/20 overflow-hidden">
            {/* Animated gradient border effect */}
            <motion.div
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500 bg-[length:200%_100%]"
            />

            {/* Background orbs */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-purple-300/20 to-fuchsia-200/10 dark:from-purple-600/20 dark:to-fuchsia-700/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-indigo-300/20 to-purple-200/10 dark:from-indigo-600/20 dark:to-purple-700/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

            <div className="relative px-8 py-10 text-center">
              {/* Thank you icon with sparkle effect */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.15, type: "spring", stiffness: 200, damping: 15 }}
                className="relative mx-auto mb-6 inline-block"
              >
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 via-fuchsia-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30 rotate-3">
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                  >
                    <Heart className="w-11 h-11 text-white fill-white/30" strokeWidth={2} />
                  </motion.div>
                </div>
                
                {/* Sparkle decorations */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.6 }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </motion.div>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.2, 1] }}
                  transition={{ delay: 0.8 }}
                  className="absolute -bottom-1 -left-2"
                >
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </motion.div>
              </motion.div>

              {/* Main message */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
              >
                Thank You!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="text-slate-600 dark:text-slate-300 mb-6"
              >
                Your response to <span className="font-semibold text-purple-600 dark:text-purple-400">{surveyName}</span> has been recorded.
              </motion.p>

              {/* Stats card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/30 dark:to-fuchsia-900/20 rounded-2xl p-5 mb-6 border border-purple-200/50 dark:border-purple-700/30"
              >
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm mb-2 mx-auto">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">Status</div>
                    <div className="font-semibold text-slate-900 dark:text-white">Complete</div>
                  </div>
                  {questionCount && (
                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm mb-2 mx-auto">
                        <MessageSquare className="w-6 h-6 text-purple-500" />
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Answered</div>
                      <div className="font-semibold text-slate-900 dark:text-white">{questionCount} questions</div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Appreciation message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="mb-6"
              >
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">
                  &ldquo;Your feedback helps us create a better workplace for everyone.&rdquo;
                </p>
              </motion.div>

              {/* CTA Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65 }}
                onClick={onClose}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:from-purple-700 hover:via-fuchsia-700 hover:to-indigo-700 transition-all duration-200"
              >
                Continue
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}










