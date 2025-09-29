"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EnhancedWidgetProps {
  children: ReactNode;
  size?: "small" | "medium" | "large" | "wide" | "tall";
  className?: string;
  delay?: number;
}

export function EnhancedWidget({
  children,
  size = "medium",
  className,
  delay = 0,
}: EnhancedWidgetProps) {
  const sizeClasses: Record<NonNullable<EnhancedWidgetProps["size"]>, string> = {
    small: "bento-item",
    medium: "bento-item",
    large: "bento-item-large",
    wide: "bento-item-wide",
    tall: "bento-item-tall",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.4, 0, 0.2, 1],
      }}
      whileHover={{ y: -4 }}
      className={cn(sizeClasses[size], className)}
    >
      <div className="glass-premium rounded-3xl p-6 h-full hover-lift-premium transition-premium">
        {children}
      </div>
    </motion.div>
  );
}

