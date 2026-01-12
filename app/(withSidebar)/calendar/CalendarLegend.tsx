"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon, Lock, CalendarDays } from "lucide-react";

interface LegendItem {
  label: string;
  swatchClassName?: string;
  swatchStyle?: React.CSSProperties;
  icon?: LucideIcon;
}

interface CalendarLegendProps {
  categories: LegendItem[];
  showBankHoliday?: boolean;
  bankHolidayLabel?: string | null;
  showBlackout?: boolean;
}

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 5 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    y: -3,
    transition: { duration: 0.12 }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.01,
    },
  },
};

// Subtle color mapping for legend swatches - refined, professional palette
const getMutedSwatchColor = (className?: string): string => {
  if (!className) return "#cbd5e1"; // slate-300 default
  if (className.includes("annual")) return "#94a3b8"; // slate-400
  if (className.includes("sick")) return "#fbbf24"; // amber-400
  if (className.includes("training")) return "#a5b4fc"; // indigo-300
  if (className.includes("parental")) return "#f9a8d4"; // pink-300
  if (className.includes("compassion")) return "#c4b5fd"; // violet-300
  if (className.includes("medical")) return "#5eead4"; // teal-300
  if (className.includes("unpaid")) return "#9ca3af"; // gray-400
  if (className.includes("toil")) return "#7dd3fc"; // sky-300
  return "#cbd5e1"; // slate-300 default
};

export function CalendarLegend({
  categories,
  showBankHoliday = false,
  bankHolidayLabel,
  showBlackout = true,
}: CalendarLegendProps) {
  if (
    categories.length === 0 &&
    !showBankHoliday &&
    !showBlackout
  ) {
    return null;
  }

  const items: LegendItem[] = [...categories];

  if (showBankHoliday) {
    items.push({
      label: bankHolidayLabel ? `Public holiday` : "Public holiday",
      swatchClassName: "bg-emerald-400",
    });
  }

  if (showBlackout) {
    items.push({
      label: "Blackout day",
      swatchStyle: {
        backgroundImage:
          "repeating-linear-gradient(45deg,#fecaca,#fecaca 2px,#ffffff 2px,#ffffff 4px)",
        border: "1px solid rgb(251 113 133 / 0.5)",
      },
    });
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap gap-1"
    >
      <AnimatePresence mode="popLayout">
        {items.map((item) => {
          const isBlackout = item.label === "Blackout day";
          const isHoliday = item.label === "Public holiday";
          const swatchColor = getMutedSwatchColor(item.swatchClassName);
          
          return (
            <motion.div
              key={item.label}
              variants={itemVariants}
              layout
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded transition-all duration-150",
                "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750",
                "border border-gray-200 dark:border-gray-700",
                "cursor-default select-none"
              )}
            >
              <div className="relative flex items-center justify-center">
                {/* Circular swatch with muted color and subtle border */}
                <span
                  className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full border border-gray-200 dark:border-gray-600"
                  style={item.swatchStyle || { backgroundColor: swatchColor }}
                />
                {isBlackout && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-1.5 w-1.5 text-rose-500" />
                  </div>
                )}
                {isHoliday && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CalendarDays className="h-1.5 w-1.5 text-white drop-shadow-sm" />
                  </div>
                )}
              </div>
              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">{item.label}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
