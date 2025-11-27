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
  hidden: { opacity: 0, scale: 0.8, y: 10 },
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
    scale: 0.8, 
    y: -5,
    transition: { duration: 0.15 }
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.02,
    },
  },
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
      swatchClassName: "bg-emerald-500",
    });
  }

  if (showBlackout) {
    items.push({
      label: "Blackout day",
      swatchStyle: {
        backgroundImage:
          "repeating-linear-gradient(45deg,#fecaca,#fecaca 4px,#ffffff 4px,#ffffff 8px)",
        border: "1px solid rgb(248 113 113)",
      },
    });
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-wrap gap-1.5"
    >
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => {
          const Icon = item.icon;
          const isBlackout = item.label === "Blackout day";
          const isHoliday = item.label === "Public holiday";
          
          return (
            <motion.div
              key={item.label}
              variants={itemVariants}
              layout
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-200",
                "bg-muted/30 hover:bg-muted/50 border border-border/30",
                "cursor-default select-none"
              )}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative flex items-center justify-center">
                <span
                  className={cn(
                    "inline-flex h-3 w-3 shrink-0 rounded shadow-sm",
                    item.swatchClassName,
                  )}
                  style={item.swatchStyle}
                />
                {Icon && item.swatchClassName && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="h-1.5 w-1.5 text-white drop-shadow-sm" />
                  </div>
                )}
                {isBlackout && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Lock className="h-1.5 w-1.5 text-red-600" />
                  </div>
                )}
                {isHoliday && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CalendarDays className="h-1.5 w-1.5 text-white drop-shadow-sm" />
                  </div>
                )}
              </div>
              {Icon && !item.swatchClassName && !item.swatchStyle && (
                <Icon className="h-3 w-3 text-muted-foreground" />
              )}
              <span className="text-[10px] font-medium text-foreground/80">{item.label}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}
