"use client";

import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Calendar, Sun, Palmtree, Clock, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";

interface LeaveRequestSuccessAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  isAutoApproved?: boolean;
}

export default function LeaveRequestSuccessAnimation({
  isOpen,
  onClose,
  leaveType,
  startDate,
  endDate,
  totalDays,
  isAutoApproved = false,
}: LeaveRequestSuccessAnimationProps) {
  const fireConfetti = useCallback(() => {
    // Tropical/vacation themed confetti
    const colors = ["#06b6d4", "#0ea5e9", "#f59e0b", "#fbbf24", "#84cc16", "#22c55e"];
    
    // First burst - center
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.5, x: 0.5 },
      colors,
      startVelocity: 30,
      gravity: 0.8,
      ticks: 200,
      shapes: ["circle", "square"],
      zIndex: 9999,
    });

    // Side bursts with delay
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 },
        colors,
        zIndex: 9999,
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 },
        colors,
        zIndex: 9999,
      });
    }, 200);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fireConfetti();
      
      // Auto dismiss after 5 seconds
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, fireConfetti, onClose]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-NZ", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const getLeaveIcon = () => {
    const type = leaveType.toLowerCase();
    if (type.includes("annual") || type.includes("holiday")) return Plane;
    if (type.includes("sick")) return Clock;
    return Calendar;
  };

  const LeaveIcon = getLeaveIcon();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center"
        onClick={onClose}
      >
        {/* Backdrop with gradient */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-gradient-to-br from-cyan-900/40 via-sky-900/50 to-teal-900/40 backdrop-blur-md"
        />

        {/* Floating decorative elements */}
        <motion.div
          animate={{
            y: [0, -20, 0],
            rotate: [0, 10, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="absolute top-20 left-[15%] text-amber-400/30"
        >
          <Sun className="w-16 h-16" />
        </motion.div>
        
        <motion.div
          animate={{
            y: [0, 15, 0],
            rotate: [0, -5, 0],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
          className="absolute bottom-32 right-[10%] text-emerald-400/25"
        >
          <Palmtree className="w-20 h-20" />
        </motion.div>

        {/* Main card */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-md mx-4 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Card background with glassmorphism */}
          <div className="relative rounded-3xl bg-white/95 dark:bg-slate-900/95 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] backdrop-blur-xl border border-white/20 dark:border-white/10">
            {/* Decorative gradient bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-400 via-sky-400 to-teal-400 rounded-t-3xl" />
            
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-200/30 to-sky-100/20 dark:from-cyan-800/20 dark:to-sky-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
            
            <div className="relative px-8 py-10 text-center">
              {/* Animated icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                className="relative mx-auto mb-6"
              >
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-cyan-400 via-sky-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, type: "spring" }}
                  >
                    <LeaveIcon className="w-12 h-12 text-white" strokeWidth={2} />
                  </motion.div>
                </div>
                {/* Pulsing ring */}
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute inset-0 rounded-3xl border-2 border-cyan-400/50"
                />
              </motion.div>

              {/* Title */}
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-slate-900 dark:text-white mb-2"
              >
                {isAutoApproved ? "Leave Approved!" : "Request Submitted!"}
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-slate-600 dark:text-slate-300 mb-6"
              >
                {isAutoApproved 
                  ? `Your ${leaveType.toLowerCase()} has been automatically approved.`
                  : `Your ${leaveType.toLowerCase()} request is pending approval.`}
              </motion.p>

              {/* Date card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 mb-6 border border-slate-200/50 dark:border-slate-700/50"
              >
                <div className="flex items-center justify-center gap-4 text-slate-700 dark:text-slate-200">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">From</div>
                    <div className="font-semibold">{formatDate(startDate)}</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                  <div className="text-center">
                    <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">To</div>
                    <div className="font-semibold">{formatDate(endDate)}</div>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 text-sm font-medium">
                    <Calendar className="w-4 h-4" />
                    {totalDays} day{totalDays !== 1 ? "s" : ""}
                  </span>
                </div>
              </motion.div>

              {/* Status badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mb-6"
              >
                {isAutoApproved ? (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.8, type: "spring" }}
                    >
                      ✓
                    </motion.span>
                    Approved & added to calendar
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm font-medium">
                    <Clock className="w-4 h-4" />
                    You&apos;ll be notified when approved
                  </span>
                )}
              </motion.div>

              {/* CTA Button */}
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                onClick={onClose}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/30 hover:from-cyan-600 hover:to-teal-600 transition-all duration-200"
              >
                Done
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}















