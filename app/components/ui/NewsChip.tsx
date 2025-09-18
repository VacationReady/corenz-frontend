"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { motion } from "framer-motion";

interface NewsChipProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "outline" | "gradient";
  size?: "sm" | "md" | "lg";
  emoji?: string;
  onRemove?: () => void;
  onClick?: () => void;
  className?: string;
  selected?: boolean;
  animated?: boolean;
}

export default function NewsChip({
  children,
  variant = "default",
  size = "md",
  emoji,
  onRemove,
  onClick,
  className,
  selected = false,
  animated = true,
}: NewsChipProps) {
  const baseStyles = "inline-flex items-center gap-1.5 font-medium rounded-full transition-all duration-200";
  
  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-1.5 text-base",
  };

  const variantStyles = {
    default: cn(
      "bg-muted/80 text-muted-foreground hover:bg-muted",
      selected && "bg-primary/10 text-primary border-primary/20"
    ),
    primary: cn(
      "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20",
      selected && "bg-primary text-primary-foreground"
    ),
    secondary: cn(
      "bg-secondary/80 text-secondary-foreground hover:bg-secondary",
      selected && "bg-secondary text-secondary-foreground ring-2 ring-primary/50"
    ),
    outline: cn(
      "border border-border hover:bg-muted/50",
      selected && "border-primary bg-primary/5"
    ),
    gradient: cn(
      "bg-gradient-to-r from-editorial-purple/10 to-editorial-blue/10",
      "border border-editorial-purple/20 text-editorial-purple",
      "hover:from-editorial-purple/20 hover:to-editorial-blue/20",
      selected && "from-editorial-purple/30 to-editorial-blue/30"
    ),
  };

  const chipContent = (
    <span
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        onClick && "cursor-pointer hover:scale-105",
        className
      )}
      onClick={onClick}
    >
      {emoji && (
        <span className="text-base" role="img" aria-label="emoji">
          {emoji}
        </span>
      )}
      {children}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors"
          aria-label="Remove"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.2 }}
      >
        {chipContent}
      </motion.div>
    );
  }

  return chipContent;
}
