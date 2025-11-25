"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeeFormCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  delay?: number;
  noPadding?: boolean;
}

export default function EmployeeFormCard({
  title,
  description,
  icon: Icon,
  iconColor = "from-primary/20 to-blue-500/20",
  action,
  children,
  className,
  delay = 0,
  noPadding = false,
}: EmployeeFormCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(
        "glass-card rounded-3xl overflow-hidden shadow-depth-2 hover:shadow-depth-3 transition-all duration-300",
        className
      )}
    >
      {/* Card Header */}
      <div className="relative px-6 py-5 border-b border-white/20 dark:border-white/10">
        {/* Subtle gradient accent */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-blue-500/5 pointer-events-none" />
        
        <div className="relative flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.3, delay: delay + 0.1 }}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-xl",
                  "bg-gradient-to-br",
                  iconColor
                )}
              >
                <Icon className="w-5 h-5 text-primary" />
              </motion.div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              {description && (
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              )}
            </div>
          </div>
          
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      </div>
      
      {/* Card Content */}
      <div className={cn(!noPadding && "p-6")}>
        {children}
      </div>
    </motion.div>
  );
}

// Companion component for form sections within cards
interface FormSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}

export function FormSection({ title, children, className, columns = 2 }: FormSectionProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      <div className={cn("grid gap-5", gridCols[columns])}>
        {children}
      </div>
    </div>
  );
}

// Enhanced form field wrapper
interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  action,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground flex items-center gap-1"
        >
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
        {action}
      </div>
      
      {children}
      
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive flex items-center gap-1"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

