"use client";

import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle, HandHeart, Sparkles, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

interface ExitInterviewSuccessAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  employeeName?: string;
}

export default function ExitInterviewSuccessAnimation({
  isOpen,
  onClose,
  employeeName,
}: ExitInterviewSuccessAnimationProps) {
  const fireConfetti = useCallback(() => {
    // Warm, appreciative colors - rose, amber, soft blues
    const colors = ["#f472b6", "#fb7185", "#fbbf24", "#f59e0b", "#93c5fd", "#a5b4fc"];
    
    // Gentle celebration - not too over the top for a farewell
    confetti({
      particleCount: 60,
      spread: 80,
      origin: { y: 0.55 },
      colors,
      startVelocity: 30,
      gravity: 1,
      ticks: 200,
      shapes: ["circle"],
      zIndex: 9999,
    });

    // Soft side bursts
    setTimeout(() => {
      confetti({
        particleCount: 30,
        angle: 60,
        spread: 45,
        origin: { x: 0.1, y: 0.6 },
        colors,
        startVelocity: 25,
        zIndex: 9999,
      });
      confetti({
        particleCount: 30,
        angle: 120,
        spread: 45,
        origin: { x: 0.9, y: 0.6 },
        colors,
        startVelocity: 25,
        zIndex: 9999,
      });
    }, 200);

    // Heart shapes (using small circles as approximation)
    setTimeout(() => {
      confetti({
        particleCount: 20,
        spread: 100,
        origin: { y: 0.5 },
        colors: ["#f472b6", "#fb7185", "#fda4af"],
        startVelocity: 15,
        gravity: 0.6,
        scalar: 1.2,
        ticks: 300,
        zIndex: 9999,
      });
    }, 400);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fireConfetti();
      const timer = setTimeout(onClose, 6000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fireConfetti, onClose]);

  if (!isOpen) return null;

  const firstName = employeeName?.split(" ")[0] || "you";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Warm gradient backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-rose-900/40 via-amber-900/40 to-indigo-900/40 backdrop-blur-md"
        />

        {/* Floating hearts */}
        {[
          { top: "18%", left: "12%", delay: 0, size: 24 },
          { top: "28%", right: "14%", delay: 0.4, size: 20 },
          { bottom: "32%", left: "10%", delay: 0.8, size: 16 },
          { bottom: "24%", right: "16%", delay: 1.2, size: 22 },
        ].map((heart, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0, y: 20 }}
            animate={{
              opacity: [0, 0.4, 0.3],
              scale: [0, 1, 0.9],
              y: [20, -10, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              delay: heart.delay,
              ease: "easeInOut",
            }}
            style={{
              position: "absolute",
              top: heart.top,
              left: heart.left,
              right: heart.right,
              bottom: heart.bottom,
            }}
            className="text-rose-400/50"
          >
            <Heart 
              className="fill-current" 
              style={{ width: heart.size, height: heart.size }} 
            />
          </motion.div>
        ))}

        {/* Main card */}
        <motion.div
          initial={{ scale: 0.85, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 30 }}
          transition={{ type: "spring", stiffness: 260, damping: 25 }}
          className="relative w-full max-w-md mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-[0_32px_64px_-16px_rgba(244,114,182,0.35)] backdrop-blur-xl border border-white/20 dark:border-rose-500/20 overflow-hidden">
            {/* Warm gradient header */}
            <motion.div
              animate={{
                backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="h-1.5 bg-gradient-to-r from-rose-400 via-amber-400 to-pink-400 bg-[length:200%_100%]"
            />

            {/* Background orbs */}
            <div className="absolute top-0 right-0 w-56 h-56 bg-gradient-to-br from-rose-200/30 to-amber-100/20 dark:from-rose-700/20 dark:to-amber-800/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-200/30 to-rose-100/20 dark:from-pink-700/20 dark:to-rose-800/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />

            <div className="relative px-8 py-10 text-center">
              {/* Animated thank you icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 180, damping: 14 }}
                className="relative mx-auto mb-6 inline-block"
              >
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-br from-rose-400 via-pink-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/30"
                >
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                  >
                    <HandHeart className="w-12 h-12 text-white" strokeWidth={1.5} />
                  </motion.div>
                </motion.div>

                {/* Decorative sparkles */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: [0, 1.3, 1] }}
                  transition={{ delay: 0.6 }}
                  className="absolute -top-2 -right-1"
                >
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </motion.div>
              </motion.div>

              {/* Main message */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
              >
                Thank You for Sharing
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-slate-600 dark:text-slate-300 mb-6"
              >
                Your exit interview has been submitted successfully.
              </motion.p>

              {/* Appreciation card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-rose-50 to-amber-50 dark:from-rose-900/20 dark:to-amber-900/10 rounded-2xl p-6 mb-6 border border-rose-200/50 dark:border-rose-700/30"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center shadow-sm">
                    <MessageCircle className="w-5 h-5 text-rose-500" />
                  </div>
                  <div className="text-left">
                    <p className="text-slate-700 dark:text-slate-200 font-medium mb-1">
                      Your feedback matters
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Your honest insights will help us improve the experience for future team members.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Farewell message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-6"
              >
                <p className="text-slate-600 dark:text-slate-300">
                  We wish <span className="font-semibold text-rose-600 dark:text-rose-400">{firstName}</span> all the best in your future endeavors.
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 italic">
                  &ldquo;Once part of the team, always part of the family.&rdquo;
                </p>
              </motion.div>

              {/* Hearts decoration */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex justify-center gap-1 mb-6"
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8 + i * 0.1, type: "spring" }}
                  >
                    <Heart 
                      className={`w-5 h-5 ${
                        i === 2 ? "text-rose-500 fill-rose-500" : "text-rose-300 fill-rose-300"
                      }`} 
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* CTA Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={onClose}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-semibold shadow-lg shadow-rose-500/25 hover:shadow-xl hover:shadow-rose-500/30 hover:from-rose-600 hover:via-pink-600 hover:to-amber-600 transition-all duration-200 flex items-center justify-center gap-2"
              >
                Take Care <ArrowRight className="w-4 h-4" />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}






