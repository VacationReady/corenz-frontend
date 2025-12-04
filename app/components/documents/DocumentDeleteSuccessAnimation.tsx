"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, CheckCircle2, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import confetti from "canvas-confetti";

interface DocumentDeleteSuccessAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
}

export default function DocumentDeleteSuccessAnimation({
  isOpen,
  onClose,
  documentName,
}: DocumentDeleteSuccessAnimationProps) {
  useEffect(() => {
    if (isOpen) {
      // Subtle confetti effect for deletion - smaller, quicker
      const duration = 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 20, spread: 180, ticks: 40, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 25 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.3, 0.7), y: 0.4 },
          colors: ["#94a3b8", "#64748b", "#475569"], // Slate gray colors
        });
      }, 200);

      // Auto-dismiss after animation
      const dismissTimer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => {
        clearInterval(interval);
        clearTimeout(dismissTimer);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-10 max-w-lg mx-4 text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-slate-100 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/30 rounded-full blur-3xl opacity-30 -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-gray-100 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/30 rounded-full blur-3xl opacity-30 -z-10" />

        {/* Animated Icon - Check with Trash overlay effect */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-lg relative"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="absolute inset-0 rounded-full bg-white/20"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <CheckCircle2 className="w-12 h-12 text-white relative z-10" strokeWidth={2.5} />
          </motion.div>
        </motion.div>

        {/* Content */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-gray-900 dark:text-white mb-3"
        >
          Document Deleted
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 dark:text-gray-300 mb-2 text-lg"
        >
          <span className="font-semibold text-gray-900 dark:text-white">&ldquo;{documentName}&rdquo;</span>{" "}
          has been permanently removed.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-gray-500 dark:text-gray-400 mb-8"
        >
          All associated acknowledgements and signatures have also been deleted.
        </motion.p>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button 
            onClick={onClose} 
            size="lg" 
            className="px-8 shadow-lg hover:shadow-xl transition-shadow rounded-full"
          >
            Done <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
















