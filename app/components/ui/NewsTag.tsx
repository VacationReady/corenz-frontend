"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Hash, TrendingUp, Star, Clock, AlertCircle, Zap } from "lucide-react";

interface NewsTagProps {
  label: string;
  type?: "topic" | "trending" | "featured" | "urgent" | "new" | "breaking";
  emoji?: string;
  count?: number;
  onClick?: () => void;
  className?: string;
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}

const typeConfig = {
  topic: {
    icon: Hash,
    gradient: "from-blue-500/10 to-purple-500/10",
    borderColor: "border-blue-500/20",
    textColor: "text-blue-700 dark:text-blue-300",
    emoji: "🏷️",
  },
  trending: {
    icon: TrendingUp,
    gradient: "from-orange-500/10 to-red-500/10",
    borderColor: "border-orange-500/20",
    textColor: "text-orange-700 dark:text-orange-300",
    emoji: "🔥",
  },
  featured: {
    icon: Star,
    gradient: "from-yellow-500/10 to-amber-500/10",
    borderColor: "border-yellow-500/20",
    textColor: "text-yellow-700 dark:text-yellow-300",
    emoji: "⭐",
  },
  urgent: {
    icon: AlertCircle,
    gradient: "from-red-500/10 to-pink-500/10",
    borderColor: "border-red-500/20",
    textColor: "text-red-700 dark:text-red-300",
    emoji: "🚨",
  },
  new: {
    icon: Clock,
    gradient: "from-green-500/10 to-emerald-500/10",
    borderColor: "border-green-500/20",
    textColor: "text-green-700 dark:text-green-300",
    emoji: "✨",
  },
  breaking: {
    icon: Zap,
    gradient: "from-purple-500/10 to-pink-500/10",
    borderColor: "border-purple-500/20",
    textColor: "text-purple-700 dark:text-purple-300",
    emoji: "⚡",
  },
};

export default function NewsTag({
  label,
  type = "topic",
  emoji,
  count,
  onClick,
  className,
  size = "md",
  glow = false,
}: NewsTagProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const displayEmoji = emoji || config.emoji;

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-3 py-1 text-sm gap-1.5",
    lg: "px-4 py-1.5 text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        "bg-gradient-to-r border backdrop-blur-sm",
        "transition-all duration-200",
        config.gradient,
        config.borderColor,
        config.textColor,
        sizeStyles[size],
        onClick && "cursor-pointer hover:shadow-md",
        glow && "shadow-lg shadow-primary/20 animate-glow",
        className
      )}
    >
      {displayEmoji ? (
        <span className="text-base" role="img" aria-label={type}>
          {displayEmoji}
        </span>
      ) : (
        <Icon className={iconSizes[size]} />
      )}
      <span>{label}</span>
      {count !== undefined && (
        <span className={cn(
          "ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold",
          "bg-black/10 dark:bg-white/10"
        )}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </motion.button>
  );
}
