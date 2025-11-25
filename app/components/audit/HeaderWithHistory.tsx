"use client";

import { motion } from "framer-motion";
import { LucideIcon, History, Briefcase, User, CreditCard, Phone, FileText, Calendar, TrendingUp, GraduationCap, Car, ClipboardCheck, Settings } from "lucide-react";
import HistoryButton from "./HistoryButton";
import { cn } from "@/lib/utils";

// Map section names to icons and colors
const sectionConfig: Record<string, { icon: LucideIcon; color: string; gradient: string }> = {
  "employment-details": { 
    icon: Briefcase, 
    color: "text-emerald-600 dark:text-emerald-400",
    gradient: "from-emerald-500 to-teal-500"
  },
  "personal-info": { 
    icon: User, 
    color: "text-violet-600 dark:text-violet-400",
    gradient: "from-violet-500 to-purple-500"
  },
  "bank-payroll": { 
    icon: CreditCard, 
    color: "text-amber-600 dark:text-amber-400",
    gradient: "from-amber-500 to-orange-500"
  },
  "emergency-contacts": { 
    icon: Phone, 
    color: "text-rose-600 dark:text-rose-400",
    gradient: "from-rose-500 to-pink-500"
  },
  "documents": { 
    icon: FileText, 
    color: "text-cyan-600 dark:text-cyan-400",
    gradient: "from-cyan-500 to-blue-500"
  },
  "leave": { 
    icon: Calendar, 
    color: "text-green-600 dark:text-green-400",
    gradient: "from-green-500 to-emerald-500"
  },
  "performance": { 
    icon: TrendingUp, 
    color: "text-purple-600 dark:text-purple-400",
    gradient: "from-purple-500 to-violet-500"
  },
  "training": { 
    icon: GraduationCap, 
    color: "text-blue-600 dark:text-blue-400",
    gradient: "from-blue-500 to-cyan-500"
  },
  "driver-licenses": { 
    icon: Car, 
    color: "text-slate-600 dark:text-slate-400",
    gradient: "from-slate-500 to-gray-500"
  },
  "employment-checks": { 
    icon: ClipboardCheck, 
    color: "text-teal-600 dark:text-teal-400",
    gradient: "from-teal-500 to-green-500"
  },
  "settings": { 
    icon: Settings, 
    color: "text-gray-600 dark:text-gray-400",
    gradient: "from-gray-500 to-slate-500"
  },
};

interface HeaderWithHistoryProps {
  title: string;
  employeeId: string;
  section: string;
  description?: string;
  children?: React.ReactNode;
}

export default function HeaderWithHistory({
  title,
  employeeId,
  section,
  description,
  children,
}: HeaderWithHistoryProps) {
  const config = sectionConfig[section] || { 
    icon: Briefcase, 
    color: "text-primary",
    gradient: "from-primary to-blue-500"
  };
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative mb-8"
    >
      {/* Decorative gradient blur */}
      <div 
        className={cn(
          "absolute -top-6 -left-6 w-24 h-24 rounded-full blur-3xl pointer-events-none opacity-30",
          `bg-gradient-to-br ${config.gradient}`
        )} 
      />
      
      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Icon Container */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
            className={cn(
              "flex items-center justify-center w-12 h-12 rounded-2xl",
              "bg-gradient-to-br shadow-lg",
              config.gradient
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
            {children && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="mt-1"
              >
                {children}
              </motion.div>
            )}
          </div>
        </div>
        
        {/* History Button */}
        <motion.div
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <HistoryButton 
            employeeId={employeeId} 
            section={section}
            title={`${title} History`}
            variant="ghost"
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl",
              "bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10",
              "border border-white/30 dark:border-white/10",
              "text-muted-foreground hover:text-foreground",
              "transition-all duration-200 shadow-sm hover:shadow-md"
            )}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
