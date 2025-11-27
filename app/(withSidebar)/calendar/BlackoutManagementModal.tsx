"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/Card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import Button from "@/components/ui/Button";
import { toast } from "sonner";
import { 
  CalendarIcon, 
  Plus, 
  Trash2, 
  ShieldBan, 
  Lock, 
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  Calendar as CalendarIconOutline
} from "lucide-react";
import { format } from "date-fns";
import { getEventCategoryIcon } from "@/lib/event-category-icons";
import { cn } from "@/lib/utils";

interface EventCategory {
  id: string;
  name: string;
  iconKey?: string | null;
}

interface BlackoutDay {
  id: string;
  date: string;
  allEvents: boolean;
  eventCategoryIds: string[];
  note?: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25,
    },
  },
};

export default function BlackoutManagementModal({
  open,
  setOpen,
  defaultDate,
  refreshEvents,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  defaultDate?: Date | null;
  refreshEvents: () => void;
}) {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [blackoutDays, setBlackoutDays] = useState<BlackoutDay[]>([]);
  const [newBlackoutDate, setNewBlackoutDate] = useState<Date>(new Date());
  const [newBlackoutCategories, setNewBlackoutCategories] = useState<string[]>([]);
  const [allEventsBlackout, setAllEventsBlackout] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("add");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      fetchData();
      setShowSuccess(false);
    }
  }, [open]);

  useEffect(() => {
    if (defaultDate && open) {
      setNewBlackoutDate(defaultDate);
    }
  }, [defaultDate, open]);

  const fetchData = async () => {
    try {
      const [catRes, blackoutRes] = await Promise.all([
        fetch("/api/event-categories"),
        fetch("/api/blackout-days/get"),
      ]);

      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
      }

      if (blackoutRes.ok) {
        const blackoutData = await blackoutRes.json();
        setBlackoutDays(blackoutData);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load blackout data");
    }
  };

  const addBlackoutDay = async () => {
    try {
      setLoading(true);
      const localDateStr = `${newBlackoutDate.getFullYear()}-${String(newBlackoutDate.getMonth() + 1).padStart(2, "0")}-${String(newBlackoutDate.getDate()).padStart(2, "0")}`;
      const response = await fetch("/api/blackout-days/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: localDateStr,
          allEvents: allEventsBlackout,
          eventCategoryIds: allEventsBlackout ? [] : newBlackoutCategories,
        }),
      });

      if (response.ok) {
        setShowSuccess(true);
        toast.success("Blackout day added successfully");
        setNewBlackoutCategories([]);
        setAllEventsBlackout(false);
        await fetchData();
        refreshEvents();
        
        // Reset success state after animation
        setTimeout(() => {
          setShowSuccess(false);
          setActiveTab("list");
        }, 1500);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to add blackout day");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const removeBlackoutDay = async (blackoutId: string) => {
    try {
      const response = await fetch("/api/blackout-days/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blackoutDayId: blackoutId }),
      });

      if (response.ok) {
        toast.success("Blackout day removed");
        await fetchData();
        refreshEvents();
      } else {
        toast.error("Failed to remove blackout day");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        rawContent 
        className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-2xl max-h-[90vh] rounded-3xl overflow-hidden flex flex-col"
      >
        {/* Success Overlay */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-br from-rose-500 to-red-600"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                className="p-4 bg-white/20 rounded-full backdrop-blur-sm mb-4"
              >
                <ShieldBan className="w-12 h-12 text-white" strokeWidth={2.5} />
              </motion.div>
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white mb-2"
              >
                Day Blocked!
              </motion.h3>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-white/90 text-sm"
              >
                {format(newBlackoutDate, "MMMM d, yyyy")} is now blocked
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-600 via-red-600 to-orange-600" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iNCIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          <div className="relative px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                  className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg"
                >
                  <ShieldBan className="w-7 h-7 text-white" />
                </motion.div>
                <div>
                  <motion.h2
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-2xl font-bold text-white"
                  >
                    Blackout Days
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-white/80 text-sm"
                  >
                    Block dates to prevent leave bookings
                  </motion.p>
                </div>
              </div>
              <motion.button
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                onClick={() => setOpen(false)}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-200"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-white" />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <div className="px-6 pt-4 flex-shrink-0">
            <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-xl">
              <TabsTrigger 
                value="add" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Blackout
              </TabsTrigger>
              <TabsTrigger 
                value="list" 
                className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all"
              >
                <CalendarIconOutline className="w-4 h-4 mr-2" />
                View All ({blackoutDays.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="add" className="flex-1 overflow-y-auto p-6 pt-4">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-5"
            >
              {/* Date Picker */}
              <motion.div variants={itemVariants} className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-rose-500" />
                  Select Date <span className="text-rose-500">*</span>
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start h-12 rounded-xl border-2 transition-all duration-200",
                        "bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800",
                        "border-slate-200 dark:border-slate-700 hover:border-rose-300"
                      )}
                    >
                      <CalendarIcon className="mr-3 h-5 w-5 text-rose-500" />
                      <span className="font-medium">{format(newBlackoutDate, "EEEE, MMMM d, yyyy")}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newBlackoutDate}
                      onSelect={(date) => date && setNewBlackoutDate(date)}
                      initialFocus
                      className="rounded-2xl"
                    />
                  </PopoverContent>
                </Popover>
              </motion.div>

              {/* Block All Toggle */}
              <motion.div 
                variants={itemVariants} 
                className={cn(
                  "flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-200",
                  allEventsBlackout 
                    ? "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800" 
                    : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg transition-colors",
                    allEventsBlackout ? "bg-rose-100 dark:bg-rose-800/50" : "bg-slate-200 dark:bg-slate-700"
                  )}>
                    <Lock className={cn(
                      "w-5 h-5 transition-colors",
                      allEventsBlackout ? "text-rose-600 dark:text-rose-400" : "text-slate-500"
                    )} />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold cursor-pointer">Block all event types</Label>
                    <p className="text-xs text-muted-foreground">Prevent all leave categories</p>
                  </div>
                </div>
                <Switch
                  checked={allEventsBlackout}
                  onChange={setAllEventsBlackout}
                />
              </motion.div>

              {/* Category Selection */}
              <AnimatePresence>
                {!allEventsBlackout && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Select Categories to Block
                      </Label>
                      <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-4 bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-200 dark:border-slate-700 rounded-xl">
                        {categories.map((cat) => {
                          const Icon = getEventCategoryIcon(cat.iconKey);
                          const isSelected = newBlackoutCategories.includes(cat.id);
                          return (
                            <motion.label
                              key={cat.id}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className={cn(
                                "flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all duration-200",
                                isSelected 
                                  ? "bg-rose-100 dark:bg-rose-900/30 border-2 border-rose-300 dark:border-rose-700" 
                                  : "bg-white dark:bg-slate-800 border-2 border-transparent hover:border-slate-300 dark:hover:border-slate-600"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewBlackoutCategories([...newBlackoutCategories, cat.id]);
                                  } else {
                                    setNewBlackoutCategories(newBlackoutCategories.filter((id) => id !== cat.id));
                                  }
                                }}
                                className="sr-only"
                              />
                              <div className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center transition-colors",
                                isSelected ? "bg-rose-500 text-white" : "bg-slate-200 dark:bg-slate-600"
                              )}>
                                {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>
                              <Icon className={cn(
                                "h-4 w-4",
                                isSelected ? "text-rose-600 dark:text-rose-400" : "text-slate-500"
                              )} />
                              <span className={cn(
                                "text-sm font-medium truncate",
                                isSelected ? "text-rose-700 dark:text-rose-300" : "text-slate-700 dark:text-slate-300"
                              )}>
                                {cat.name}
                              </span>
                            </motion.label>
                          );
                        })}
                      </div>
                      {newBlackoutCategories.length > 0 && (
                        <p className="text-xs text-muted-foreground px-1">
                          {newBlackoutCategories.length} {newBlackoutCategories.length === 1 ? 'category' : 'categories'} selected
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <motion.div variants={itemVariants} className="pt-2">
                <Button 
                  onClick={addBlackoutDay} 
                  disabled={loading || (!allEventsBlackout && newBlackoutCategories.length === 0)}
                  className={cn(
                    "w-full h-12 rounded-xl font-semibold transition-all duration-300",
                    "bg-gradient-to-r from-rose-600 via-red-600 to-orange-600",
                    "hover:from-rose-500 hover:via-red-500 hover:to-orange-500",
                    "text-white shadow-lg shadow-rose-500/30 hover:shadow-xl hover:shadow-rose-500/40",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                  )}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                      />
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <ShieldBan className="w-5 h-5" />
                      Add Blackout Day
                    </span>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          </TabsContent>

          <TabsContent value="list" className="flex-1 overflow-y-auto p-6 pt-4">
            <div className="space-y-3">
              {blackoutDays.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                    <CalendarIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">No blackout days</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create your first blackout day to prevent leave bookings
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("add")}
                    className="rounded-xl"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Blackout Day
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="space-y-3"
                >
                  {blackoutDays
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((blackout, index) => (
                      <motion.div
                        key={blackout.id}
                        variants={itemVariants}
                        layout
                        className={cn(
                          "group relative p-4 rounded-xl border-2 transition-all duration-200",
                          "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700",
                          "hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md"
                        )}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={cn(
                              "p-2.5 rounded-xl",
                              blackout.allEvents 
                                ? "bg-rose-100 dark:bg-rose-900/50" 
                                : "bg-amber-100 dark:bg-amber-900/50"
                            )}>
                              {blackout.allEvents ? (
                                <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                              ) : (
                                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {format(new Date(blackout.date), "EEEE, MMMM d, yyyy")}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {blackout.allEvents ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 rounded-full text-xs font-medium">
                                    <Lock className="w-3 h-3" />
                                    All events blocked
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                                    <AlertTriangle className="w-3 h-3" />
                                    {blackout.eventCategoryIds.length} {blackout.eventCategoryIds.length === 1 ? 'category' : 'categories'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeBlackoutDay(blackout.id)}
                            className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                </motion.div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
