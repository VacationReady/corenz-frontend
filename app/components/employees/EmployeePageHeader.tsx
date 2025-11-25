"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmployeePageHeaderProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  iconColor?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
}

export default function EmployeePageHeader({
  title,
  description,
  icon: Icon,
  iconColor = "from-primary to-blue-500",
  action,
  children,
}: EmployeePageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative mb-8"
    >
      {/* Decorative gradient blur */}
      <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-br from-primary/20 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-2xl",
              "bg-gradient-to-br shadow-lg",
              iconColor
            )}
          >
            <Icon className="w-6 h-6 text-white" />
          </motion.div>
          
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="text-2xl font-bold text-foreground tracking-tight"
            >
              {title}
            </motion.h1>
            {description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="text-sm text-muted-foreground mt-0.5"
              >
                {description}
              </motion.p>
            )}
          </div>
        </div>
        
        {action && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {action}
          </motion.div>
        )}
      </div>
      
      {children && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="mt-4"
        >
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

