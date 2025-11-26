"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FileText, FileSignature, Shield, ArrowRight } from "lucide-react";
import Button from "@/components/ui/Button";
import confetti from "canvas-confetti";

export type UploadSuccessType = "standard" | "ack" | "sign";

interface DocumentUploadSuccessAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  type: UploadSuccessType;
  documentName: string;
}

export default function DocumentUploadSuccessAnimation({
  isOpen,
  onClose,
  type,
  documentName,
}: DocumentUploadSuccessAnimationProps) {
  useEffect(() => {
    if (isOpen) {
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
          colors: type === "sign" 
            ? ["#3b82f6", "#60a5fa", "#93c5fd"] // Blue for signature
            : ["#10b981", "#34d399", "#6ee7b7"], // Green for others
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: type === "sign" 
            ? ["#3b82f6", "#60a5fa", "#93c5fd"]
            : ["#10b981", "#34d399", "#6ee7b7"],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const getConfig = () => {
    switch (type) {
      case "sign":
        return {
          title: "Sent for Signature",
          message: (
            <>
              Signature request for <span className="font-semibold text-gray-900">{documentName}</span> has been sent.
            </>
          ),
          icon: FileSignature,
          gradient: "from-blue-400 to-indigo-500",
          bgGradient: "from-blue-100 to-indigo-50",
          iconColor: "text-white",
          subMessage: "The employee will be notified to sign this document.",
        };
      case "ack":
        return {
          title: "Upload Complete",
          message: (
            <>
              <span className="font-semibold text-gray-900">{documentName}</span> has been uploaded and requires acknowledgement.
            </>
          ),
          icon: CheckCircle2,
          gradient: "from-emerald-400 to-emerald-600",
          bgGradient: "from-emerald-100 to-green-50",
          iconColor: "text-white",
          subMessage: "The employee will be notified to acknowledge this document.",
        };
      default:
        return {
          title: "Upload Successful",
          message: (
            <>
              <span className="font-semibold text-gray-900">{documentName}</span> has been safely stored.
            </>
          ),
          icon: FileText,
          gradient: "from-emerald-400 to-emerald-600",
          bgGradient: "from-emerald-100 to-green-50",
          iconColor: "text-white",
          subMessage: "The document is now available in the employee profile.",
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

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
        className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg mx-4 text-center relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background decoration */}
        <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${config.bgGradient} rounded-full blur-3xl opacity-30 -z-10`} />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-gray-100 to-gray-50 rounded-full blur-3xl opacity-30 -z-10" />

        {/* Animated Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className={`w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-lg relative`}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4 }}
            className={`absolute inset-0 rounded-full bg-white/20 animate-ping`}
          />
          <Icon className={`w-12 h-12 ${config.iconColor} relative z-10`} strokeWidth={2} />
        </motion.div>

        {/* Content */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-gray-900 mb-3"
        >
          {config.title}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-gray-600 mb-2 text-lg"
        >
          {config.message}
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-gray-500 mb-8"
        >
          {config.subMessage}
        </motion.p>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Button onClick={onClose} size="lg" className="px-8 shadow-lg hover:shadow-xl transition-shadow rounded-full">
            Done <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}







