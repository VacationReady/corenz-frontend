"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Button from "@/components/ui/Button";
import { 
  Calendar, 
  ShieldBan, 
  User, 
  Palmtree, 
  Clock,
  Sparkles,
  X,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";
import QuickLeaveBookingModal from "./QuickLeaveBookingModal";
import { cn } from "@/lib/utils";

interface DayActionSheetProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedDate: Date | null;
  onBlockDay: () => void;
  onBookLeave: () => void;
  refreshCalendar?: () => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 25,
    },
  },
};

interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  onClick: () => void;
  hoverColor: string;
  delay?: number;
}

function ActionCard({ icon, iconBg, title, description, onClick, hoverColor, delay = 0 }: ActionCardProps) {
  return (
    <motion.button
      variants={itemVariants}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative overflow-hidden w-full p-5 rounded-2xl border-2 border-border/50 bg-card",
        "flex items-center gap-4 text-left transition-all duration-300",
        "hover:shadow-xl hover:shadow-black/5",
        hoverColor
      )}
    >
      {/* Background gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icon */}
      <motion.div
        className={cn(
          "relative flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg",
          iconBg
        )}
        whileHover={{ rotate: [0, -5, 5, 0] }}
        transition={{ duration: 0.5 }}
      >
        {icon}
      </motion.div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      </div>

      {/* Arrow */}
      <ChevronRight className="h-5 w-5 text-muted-foreground/50 transition-transform group-hover:translate-x-1" />
    </motion.button>
  );
}

export default function DayActionSheet({
  open,
  setOpen,
  selectedDate,
  onBlockDay,
  onBookLeave,
  refreshCalendar,
}: DayActionSheetProps) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const handleBlockDay = () => {
    setOpen(false);
    onBlockDay();
  };

  const handleBookLeave = () => {
    setOpen(false);
    setShowLeaveModal(true);
  };

  // Calculate day info
  const isWeekend = selectedDate ? [0, 6].includes(selectedDate.getDay()) : false;
  const isToday = selectedDate ? 
    new Date().toDateString() === selectedDate.toDateString() : false;

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent 
          side="bottom" 
          className="h-auto rounded-t-3xl border-t-0 bg-gradient-to-b from-card via-card to-muted/20"
        >
          {/* Drag Handle */}
          <div className="flex justify-center pt-2 pb-4">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
          </div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="px-2 pb-6"
          >
            {/* Header */}
            <motion.div variants={itemVariants} className="mb-6">
              <SheetHeader className="text-left">
                <div className="flex items-center gap-3 mb-2">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                    className="p-2.5 bg-gradient-to-br from-primary/20 to-violet-500/20 rounded-xl"
                  >
                    <Calendar className="w-5 h-5 text-primary" />
                  </motion.div>
                  <div>
                    <SheetTitle className="text-xl font-bold">
                      {selectedDate ? format(selectedDate, "EEEE") : "Select Action"}
                    </SheetTitle>
                    {selectedDate && (
                      <p className="text-sm text-muted-foreground">
                        {format(selectedDate, "d MMMM yyyy")}
                      </p>
                    )}
                  </div>
                </div>

                {/* Date Tags */}
                {selectedDate && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {isToday && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium"
                      >
                        <Sparkles className="h-3 w-3" />
                        Today
                      </motion.span>
                    )}
                    {isWeekend && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.05 }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 text-xs font-medium"
                      >
                        <Clock className="h-3 w-3" />
                        Weekend
                      </motion.span>
                    )}
                  </div>
                )}

                <SheetDescription className="text-muted-foreground mt-3">
                  Choose an action for this day
                </SheetDescription>
              </SheetHeader>
            </motion.div>

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ActionCard
                icon={<Palmtree className="w-7 h-7 text-white" />}
                iconBg="bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30"
                title="Book Leave"
                description="Schedule time off for an employee on this day"
                onClick={handleBookLeave}
                hoverColor="hover:border-emerald-300 dark:hover:border-emerald-700"
              />

              <ActionCard
                icon={<ShieldBan className="w-7 h-7 text-white" />}
                iconBg="bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/30"
                title="Block Day"
                description="Prevent any leave bookings for this day"
                onClick={handleBlockDay}
                hoverColor="hover:border-rose-300 dark:hover:border-rose-700"
              />
            </div>

            {/* Cancel Button */}
            <motion.div variants={itemVariants} className="mt-6">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="w-full h-12 rounded-2xl border-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              >
                Cancel
              </Button>
            </motion.div>
          </motion.div>
        </SheetContent>
      </Sheet>

      <QuickLeaveBookingModal
        open={showLeaveModal}
        setOpen={setShowLeaveModal}
        defaultStartDate={selectedDate}
        defaultEndDate={selectedDate}
        onSubmitted={() => {
          onBookLeave();
          refreshCalendar?.();
        }}
      />
    </>
  );
}
