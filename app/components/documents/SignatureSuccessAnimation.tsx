"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { PenTool, Calendar, Shield, FileCheck } from "lucide-react";
import Button from "@/components/ui/Button";
import confetti from "canvas-confetti";

interface SignatureSuccessAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  documentName: string;
  signedAt: Date;
  signatureMethod: "TYPED" | "DRAWN";
  companyName?: string; // Multi-tenancy support
}

export default function SignatureSuccessAnimation({
  isOpen,
  onClose,
  documentName,
  signedAt,
  signatureMethod,
  companyName,
}: SignatureSuccessAnimationProps) {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti animation with signature theme
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 80, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 60 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"],
          shapes: ["circle", "square"],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#6366f1", "#818cf8", "#a5b4fc", "#c7d2fe"],
          shapes: ["circle", "square"],
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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.8 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 200, damping: 25 }}
        className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg mx-4 text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated background gradients */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-200 to-purple-100 rounded-full blur-3xl opacity-30 -z-10"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear",
          }}
          className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-blue-200 to-cyan-100 rounded-full blur-3xl opacity-30 -z-10"
        />

        {/* Animated Success Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
          className="w-28 h-28 mx-auto mb-6 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-2xl relative"
        >
          {/* Pulsing rings */}
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full border-4 border-indigo-400"
          />
          <motion.div
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 0.5,
            }}
            className="absolute inset-0 rounded-full border-4 border-indigo-300"
          />
          
          <motion.div
            initial={{ rotate: -180 }}
            animate={{ rotate: 0 }}
            transition={{ delay: 0.4, type: "spring" }}
          >
            <PenTool className="w-14 h-14 text-white relative z-10" strokeWidth={2.5} />
          </motion.div>
        </motion.div>

        {/* Success Message */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-gray-900 mb-3"
        >
          Signature Captured!
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-2"
        >
          Your signature has been securely recorded
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-gray-500"
        >
          Document: <span className="font-semibold text-gray-700">{documentName}</span>
        </motion.p>

        {/* Details Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-6 space-y-3"
        >
          {/* Signature Method */}
          <div className="flex items-center justify-center gap-2 text-sm bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <FileCheck className="w-4 h-4 text-indigo-600" />
            <span className="text-indigo-900 font-medium">
              {signatureMethod === "DRAWN" ? "Hand-drawn signature" : "Typed signature"}
            </span>
          </div>

          {/* Timestamp */}
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>
              Signed on {signedAt.toLocaleDateString("en-NZ", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>

          {/* NZ Compliance Notice */}
          <div className="flex items-start gap-2 text-xs text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3">
            <Shield className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-left">
              This electronic signature is legally binding under the{" "}
              <span className="font-semibold">Electronic Transactions Act 2002 (NZ)</span>.
              Your signature is encrypted and stored securely in compliance with the{" "}
              <span className="font-semibold">Privacy Act 2020</span>.
            </p>
          </div>

          {companyName && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="text-xs text-gray-400 mt-3"
            >
              {companyName} • Secure Document Management
            </motion.p>
          )}
        </motion.div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-8"
        >
          <Button
            onClick={onClose}
            size="lg"
            className="px-10 shadow-xl hover:shadow-2xl transition-all bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800"
          >
            Continue
          </Button>
        </motion.div>

        {/* Decorative elements */}
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 0.1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute -bottom-10 -right-10 w-40 h-40"
        >
          <PenTool className="w-full h-full text-indigo-300" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
