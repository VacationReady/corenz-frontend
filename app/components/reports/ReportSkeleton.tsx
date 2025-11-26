"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Report Skeleton Components
 * 
 * Enterprise-grade skeleton loaders for the reporting system.
 * Provides accurate visual representation of loading states.
 */

// Base skeleton pulse animation
const pulseAnimation = {
  initial: { opacity: 0.5 },
  animate: {
    opacity: [0.5, 0.8, 0.5],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className }) => (
  <motion.div
    {...pulseAnimation}
    className={cn(
      "bg-gradient-to-r from-muted/60 via-muted to-muted/60 rounded",
      className
    )}
  />
);

/**
 * Report Header Skeleton
 */
export function ReportHeaderSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50"
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Back button skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="w-16 h-4 rounded hidden sm:block" />
          </div>

          {/* Center title skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-xl" />
            <div className="space-y-1">
              <Skeleton className="w-32 h-4 rounded" />
              <Skeleton className="w-20 h-3 rounded hidden sm:block" />
            </div>
          </div>

          {/* Close button skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="w-10 h-4 rounded hidden sm:block" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Report Stats Bar Skeleton
 */
export function ReportStatsBarSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="glass-card rounded-2xl p-5 shadow-depth-2"
    >
      {/* Stats Row */}
      <div className="flex flex-wrap items-center gap-4 mb-5 pb-5 border-b border-border/50">
        <Skeleton className="w-24 h-10 rounded-xl" />
        <Skeleton className="w-28 h-10 rounded-xl" />
        <Skeleton className="w-36 h-10 rounded-xl" />
      </div>

      {/* Actions Row */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="w-32 h-10 rounded-xl" />
        <Skeleton className="w-28 h-10 rounded-xl" />
        <Skeleton className="w-36 h-10 rounded-xl" />
        <div className="ml-auto">
          <Skeleton className="w-28 h-10 rounded-xl" />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Report Table Skeleton
 */
interface ReportTableSkeletonProps {
  columns?: number;
  rows?: number;
}

export function ReportTableSkeleton({ columns = 6, rows = 10 }: ReportTableSkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass-premium rounded-2xl shadow-premium overflow-hidden"
    >
      <div className="p-5">
        {/* Search and Filter Bar */}
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-col gap-2 lg:flex-row lg:items-center">
            <Skeleton className="h-10 w-full lg:max-w-md rounded-lg" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-20 rounded-lg" />
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              {/* Header */}
              <thead className="bg-gray-50">
                <tr>
                  {Array.from({ length: columns }).map((_, i) => (
                    <th key={i} className="px-6 py-3">
                      <Skeleton className="h-4 w-20 rounded" />
                    </th>
                  ))}
                </tr>
              </thead>
              {/* Body */}
              <tbody className="divide-y divide-gray-200 bg-white">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                  <motion.tr
                    key={rowIndex}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: rowIndex * 0.03 }}
                  >
                    {Array.from({ length: columns }).map((_, colIndex) => (
                      <td key={colIndex} className="px-6 py-4">
                        <Skeleton 
                          className={cn(
                            "h-4 rounded",
                            colIndex === 0 ? "w-24" : colIndex === 1 ? "w-20" : "w-16"
                          )}
                        />
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Full Report Preview Skeleton
 */
export function ReportPreviewSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <ReportHeaderSkeleton />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-6 space-y-6">
        <ReportStatsBarSkeleton />
        <ReportTableSkeleton />
      </main>
    </div>
  );
}

/**
 * Report Card Skeleton (for reports list)
 */
export function ReportCardSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="glass-premium rounded-2xl overflow-hidden shadow-premium h-full flex flex-col"
    >
      {/* Card Header */}
      <div className="p-5 pb-4 flex-1">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-32 h-5 rounded" />
          </div>
          <Skeleton className="w-16 h-5 rounded-full" />
        </div>

        {/* Meta Info */}
        <div className="space-y-2.5 mt-4">
          <div className="flex items-center gap-2">
            <Skeleton className="w-3.5 h-3.5 rounded" />
            <Skeleton className="w-36 h-3 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-3.5 h-3.5 rounded" />
            <Skeleton className="w-28 h-3 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="w-3.5 h-3.5 rounded" />
            <Skeleton className="w-20 h-3 rounded" />
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className="border-t border-white/20 p-4 bg-white/30 dark:bg-black/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Skeleton className="h-9 w-16 rounded-lg" />
            <Skeleton className="h-9 w-9 rounded-lg" />
          </div>
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
      </div>
    </motion.div>
  );
}

/**
 * Report List Skeleton
 */
interface ReportListSkeletonProps {
  count?: number;
}

export function ReportListSkeleton({ count = 6 }: ReportListSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <ReportCardSkeleton />
        </motion.div>
      ))}
    </div>
  );
}

/**
 * Report Wizard Skeleton
 */
export function ReportWizardSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-5xl bg-background rounded-2xl border shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="w-48 h-6 rounded" />
              <Skeleton className="w-64 h-4 rounded" />
            </div>
            <Skeleton className="w-8 h-8 rounded" />
          </div>
        </div>

        {/* Progress Steps */}
        <div className="border-b bg-muted/40 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="w-20 h-4 rounded" />
                  <Skeleton className="w-28 h-3 rounded hidden sm:block" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[400px]">
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-16 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-between">
          <Skeleton className="w-20 h-10 rounded" />
          <Skeleton className="w-24 h-10 rounded" />
        </div>
      </motion.div>
    </div>
  );
}

/**
 * Inline Loading Indicator
 */
interface InlineLoadingProps {
  text?: string;
  size?: "sm" | "md" | "lg";
}

export function InlineLoading({ text = "Loading...", size = "md" }: InlineLoadingProps) {
  const sizes = {
    sm: { spinner: "w-4 h-4", text: "text-xs" },
    md: { spinner: "w-5 h-5", text: "text-sm" },
    lg: { spinner: "w-6 h-6", text: "text-base" },
  };

  return (
    <div className="flex items-center gap-2">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className={cn(
          "rounded-full border-2 border-primary/20 border-t-primary",
          sizes[size].spinner
        )}
      />
      <span className={cn("text-muted-foreground", sizes[size].text)}>{text}</span>
    </div>
  );
}

/**
 * Progress Overlay
 */
interface ProgressOverlayProps {
  progress: number;
  message?: string;
  isVisible: boolean;
}

export function ProgressOverlay({ progress, message = "Processing...", isVisible }: ProgressOverlayProps) {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-premium rounded-2xl p-8 shadow-premium text-center max-w-sm w-full mx-4"
      >
        {/* Circular Progress */}
        <div className="relative w-24 h-24 mx-auto mb-6">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r="42"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              className="text-muted/30"
            />
            <motion.circle
              cx="48"
              cy="48"
              r="42"
              stroke="currentColor"
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              className="text-primary"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: progress / 100 }}
              transition={{ duration: 0.3 }}
              style={{
                strokeDasharray: "264",
                strokeDashoffset: 264 - (264 * progress) / 100,
              }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-foreground">{progress}%</span>
          </div>
        </div>

        <p className="text-foreground font-semibold mb-2">{message}</p>
        <p className="text-sm text-muted-foreground">
          Please wait while we process your request...
        </p>
      </motion.div>
    </motion.div>
  );
}

export default ReportPreviewSkeleton;

