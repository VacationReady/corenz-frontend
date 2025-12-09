"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";

type UpdateType = "instant" | "pending_approval";

interface ProfileUpdateSuccessAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  fieldName?: string; // e.g., "Bank Details", "Contact Information"
  updateType?: UpdateType;
  autoDismissMs?: number;
}

export default function ProfileUpdateSuccessAnimation({
  isOpen,
  onClose,
  fieldName = "Information",
  updateType = "instant",
  autoDismissMs = 2500,
}: ProfileUpdateSuccessAnimationProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, autoDismissMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose, autoDismissMs]);

  if (!isOpen) return null;

  const isPending = updateType === "pending_approval";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
      >
        {/* Subtle backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/20 backdrop-blur-[2px] pointer-events-auto"
          onClick={onClose}
        />

        {/* Compact notification card */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -10 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          className="relative pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 px-6 py-5 flex items-center gap-4 min-w-[280px] max-w-sm">
            {/* Animated icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                isPending
                  ? "bg-amber-100 dark:bg-amber-900/30"
                  : "bg-emerald-100 dark:bg-emerald-900/30"
              }`}
            >
              {isPending ? (
                <Clock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              ) : (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.2, type: "spring" }}
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </motion.div>
              )}
            </motion.div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
                className="font-semibold text-slate-900 dark:text-white text-sm"
              >
                {isPending ? "Update Submitted" : "Update Saved"}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xs text-slate-500 dark:text-slate-400 mt-0.5"
              >
                {isPending
                  ? `${fieldName} pending approval`
                  : `${fieldName} updated successfully`}
              </motion.p>
            </div>

            {/* Security badge for sensitive updates */}
            {(fieldName.toLowerCase().includes("bank") ||
              fieldName.toLowerCase().includes("payment")) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex-shrink-0"
              >
                <ShieldCheck className="w-5 h-5 text-slate-400 dark:text-slate-500" />
              </motion.div>
            )}
          </div>

          {/* Progress bar for auto-dismiss */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-b-2xl overflow-hidden"
          >
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: autoDismissMs / 1000, ease: "linear" }}
              className={`h-full ${
                isPending
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            />
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

















