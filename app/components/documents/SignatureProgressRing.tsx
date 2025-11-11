"use client";

import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock } from "lucide-react";

interface SignatureProgressRingProps {
  completed: number;
  total: number;
  size?: "sm" | "md" | "lg";
}

export default function SignatureProgressRing({
  completed,
  total,
  size = "md",
}: SignatureProgressRingProps) {
  const percentage = total > 0 ? (completed / total) * 100 : 0;
  const isComplete = percentage === 100;

  const sizeClasses = {
    sm: { ring: "w-10 h-10", icon: "w-4 h-4", text: "text-xs" },
    md: { ring: "w-12 h-12", icon: "w-5 h-5", text: "text-xs" },
    lg: { ring: "w-16 h-16", icon: "w-6 h-6", text: "text-sm" },
  };

  const current = sizeClasses[size];
  const radius = size === "lg" ? 28 : size === "md" ? 20 : 16;
  const strokeWidth = 4;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage / 100);

  return (
    <div className="flex items-center gap-3">
      <div className={`relative ${current.ring}`}>
        {/* Background circle */}
        <svg
          className={`${current.ring} transform -rotate-90`}
          viewBox={`0 0 ${radius * 2 + strokeWidth * 2} ${radius * 2 + strokeWidth * 2}`}
        >
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
          <motion.circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            className={isComplete ? "text-emerald-500" : "text-indigo-500"}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </svg>
        
        {/* Center icon/text */}
        <div className="absolute inset-0 flex items-center justify-center">
          {isComplete ? (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <CheckCircle2 className={`${current.icon} text-emerald-600`} strokeWidth={2.5} />
            </motion.div>
          ) : (
            <span className={`${current.text} font-semibold text-gray-700`}>
              {completed}/{total}
            </span>
          )}
        </div>
      </div>

      <div>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-sm font-medium text-gray-900"
        >
          {isComplete ? "Fully Signed" : "Signatures Pending"}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xs text-gray-500 flex items-center gap-1"
        >
          {!isComplete && <Clock className="w-3 h-3" />}
          {completed} of {total} completed
        </motion.div>
      </div>
    </div>
  );
}
