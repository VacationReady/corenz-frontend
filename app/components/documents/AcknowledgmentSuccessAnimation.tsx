"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Calendar, Shield } from "lucide-react";
import Button from "@/components/ui/Button";
import confetti from "canvas-confetti";

interface AcknowledgmentSuccessAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  acknowledgedAt: Date;
  companyName?: string; // Multi-tenancy support
}

export default function AcknowledgmentSuccessAnimation({
  isOpen,
  onClose,
  documentName,
  acknowledgedAt,
  companyName,
}: AcknowledgmentSuccessAnimationProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti animation
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#10b981", "#34d399", "#6ee7b7"],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#10b981", "#34d399", "#6ee7b7"],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen]);

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
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 10 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg mx-4 text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-100 to-green-50 rounded-full blur-3xl opacity-30 -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-100 to-cyan-50 rounded-full blur-3xl opacity-30 -z-10" />

        {/* Animated Checkmark */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg relative"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
            className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75"
          />
          <CheckCircle2 className="w-12 h-12 text-white relative z-10" strokeWidth={3} />
        </motion.div>

        {/* Success Message */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-gray-900 mb-3"
        >
          Document Acknowledged!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-2"
        >
          Thank you for reviewing{" "}
          <span className="font-semibold text-gray-900">{documentName}</span>
        </motion.p>

        {/* Details Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6 space-y-3"
        >
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>
              Acknowledged on {acknowledgedAt.toLocaleDateString("en-NZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>

          {/* NZ Compliance Notice */}
          <div className="flex items-start gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-left">
              Your acknowledgment has been recorded and is legally binding under NZ employment law.
              This action is auditable and complies with the{" "}
              <span className="font-semibold">Privacy Act 2020</span>.
            </p>
          </div>

          {companyName && (
            <p className="text-xs text-gray-400 mt-2">
              {companyName} • Document Management System
            </p>
          )}
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <Button onClick={onClose} size="lg" className="px-8 shadow-lg hover:shadow-xl transition-shadow">
            Continue
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
