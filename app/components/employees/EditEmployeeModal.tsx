"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import Button from "@/components/ui/Button";
import {
  Users,
  Search,
  ArrowLeft,
  User,
  Briefcase,
  CreditCard,
  Phone,
  FileText,
  Calendar,
  TrendingUp,
  GraduationCap,
  Car,
  ClipboardCheck,
  PlayCircle,
  LogOut,
  Settings,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MinimalEmployeeForEdit {
  id: string;
  userId: string;
  fullName: string;
  departmentId: string | null;
  departmentName?: string;
  jobRoleId: string | null;
  jobRoleName?: string;
  avatar: {
    path: string | null;
    signedUrl: string | null;
  };
}

interface EditEmployeeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const screenConfig = [
  { label: "Overview", href: "overview", icon: User, color: "from-blue-500 to-indigo-500", description: "Profile summary" },
  { label: "Personal Information", href: "personal-information", icon: User, color: "from-violet-500 to-purple-500", description: "Contact & details" },
  { label: "Employment Details", href: "employment-details", icon: Briefcase, color: "from-emerald-500 to-teal-500", description: "Role & contract" },
  { label: "Bank & Payroll", href: "bank-payroll", icon: CreditCard, color: "from-amber-500 to-orange-500", description: "Payment info" },
  { label: "Emergency Contacts", href: "emergency-contacts", icon: Phone, color: "from-rose-500 to-pink-500", description: "Emergency info" },
  { label: "Documents", href: "documents", icon: FileText, color: "from-cyan-500 to-blue-500", description: "Files & docs" },
  { label: "Leave", href: "leave", icon: Calendar, color: "from-green-500 to-emerald-500", description: "Time off" },
  { label: "Performance", href: "performance", icon: TrendingUp, color: "from-purple-500 to-violet-500", description: "Reviews & goals" },
  { label: "Training", href: "training", icon: GraduationCap, color: "from-blue-500 to-cyan-500", description: "Learning" },
  { label: "Driver Licenses", href: "driver-licenses", icon: Car, color: "from-slate-500 to-gray-500", description: "Licenses" },
  { label: "Employment Checks", href: "employment-checks", icon: ClipboardCheck, color: "from-teal-500 to-green-500", description: "Background" },
  { label: "Onboarding", href: "onboarding", icon: PlayCircle, color: "from-green-500 to-lime-500", description: "Getting started" },
  { label: "Offboarding", href: "offboarding", icon: LogOut, color: "from-orange-500 to-red-500", description: "Exit process" },
  { label: "Settings", href: "settings", icon: Settings, color: "from-gray-500 to-slate-500", description: "Preferences" },
];

export default function EditEmployeeModal({ open, onOpenChange }: EditEmployeeModalProps) {
  const router = useRouter();
  const [employees, setEmployees] = useState<MinimalEmployeeForEdit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<MinimalEmployeeForEdit | null>(null);
  const [step, setStep] = useState<"select" | "screens">("select");

  // Load employees when modal opens
  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setEmployees(null);
      setLoading(false);
      setSearchQuery("");
      setSelectedEmployee(null);
      setStep("select");
      return;
    }

    let active = true;
    const loadAllEmployees = async () => {
      setLoading(true);
      const allEmployees: MinimalEmployeeForEdit[] = [];
      let cursor: string | null = null;
      let hasMore = true;

      try {
        while (hasMore) {
          const params = new URLSearchParams({ status: "all", limit: "100" });
          if (cursor) params.set("cursor", cursor);

          const res = await fetch(`/api/employees/minimal?${params.toString()}`, {
            cache: "no-store",
          });

          if (!res.ok) break;

          const data = await res.json();
          if (!active) return;

          if (Array.isArray(data?.data)) {
            allEmployees.push(...data.data);
          }

          cursor = data?.pagination?.cursor || null;
          hasMore = data?.pagination?.hasMore ?? false;
        }

        if (active) {
          setEmployees(allEmployees);
        }
      } catch (err) {
        console.error("Failed to load employees:", err);
        if (active) {
          setEmployees([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadAllEmployees();
    return () => {
      active = false;
    };
  }, [open]);

  // Filter employees based on search
  const filteredEmployees = useMemo(() => {
    if (!employees) return [];
    const query = searchQuery.toLowerCase().trim();
    if (!query) return employees;
    return employees.filter((e) =>
      e.fullName.toLowerCase().includes(query) ||
      e.departmentName?.toLowerCase().includes(query) ||
      e.jobRoleName?.toLowerCase().includes(query)
    );
  }, [employees, searchQuery]);

  const handleSelectEmployee = (employee: MinimalEmployeeForEdit) => {
    setSelectedEmployee(employee);
    setStep("screens");
  };

  const handleNavigateToScreen = (href: string) => {
    if (!selectedEmployee) return;
    router.push(`/employees/${selectedEmployee.id}/${href}`);
    onOpenChange(false);
  };

  const handleBack = () => {
    setSelectedEmployee(null);
    setStep("select");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 bg-transparent border-none shadow-none max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="glass-ultra rounded-3xl overflow-hidden shadow-depth-5"
        >
          {/* Header with gradient accent */}
          <div className="relative px-8 pt-8 pb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-blue-500/10 to-violet-500/5" />
            <div className="relative">
              <AnimatePresence mode="wait">
                {step === "select" ? (
                  <motion.div
                    key="select-header"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center gap-4"
                  >
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20 text-primary">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        Edit Employee
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Select an employee to view and edit their profile
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="screens-header"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-4"
                  >
                    <motion.button
                      onClick={handleBack}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="p-2.5 rounded-xl bg-white/50 hover:bg-white/80 dark:bg-white/10 dark:hover:bg-white/20 text-muted-foreground hover:text-foreground transition-all"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </motion.button>
                    <Avatar
                      size={48}
                      name={selectedEmployee?.fullName}
                      src={selectedEmployee?.avatar?.signedUrl || undefined}
                    />
                    <div>
                      <h2 className="text-2xl font-bold text-foreground">
                        {selectedEmployee?.fullName}
                      </h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedEmployee?.jobRoleName || selectedEmployee?.departmentName || "Select a screen to edit"}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 pb-8">
            <AnimatePresence mode="wait">
              {step === "select" ? (
                <motion.div
                  key="select-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by name, department, or role..."
                      className="h-12 pl-12 rounded-xl border-muted/50 bg-white/50 dark:bg-white/5 focus:border-primary focus:ring-primary/20 transition-all text-base"
                    />
                  </div>

                  {/* Employee List */}
                  <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent">
                    {loading ? (
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                            <Skeleton className="w-11 h-11 rounded-full" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-1/2" />
                              <Skeleton className="h-3 w-1/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredEmployees.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-center py-12"
                      >
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/30 mb-4">
                          <Users className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground font-medium">
                          {searchQuery ? "No employees match your search" : "No employees found"}
                        </p>
                        {searchQuery && (
                          <button
                            onClick={() => setSearchQuery("")}
                            className="mt-2 text-sm text-primary hover:underline"
                          >
                            Clear search
                          </button>
                        )}
                      </motion.div>
                    ) : (
                      filteredEmployees.map((employee, index) => (
                        <motion.button
                          key={employee.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.02, duration: 0.2 }}
                          onClick={() => handleSelectEmployee(employee)}
                          className={cn(
                            "w-full flex items-center gap-4 p-4 rounded-2xl text-left",
                            "bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10",
                            "border border-transparent hover:border-primary/20",
                            "transition-all duration-200 group"
                          )}
                        >
                          <Avatar
                            size={44}
                            name={employee.fullName}
                            src={employee.avatar?.signedUrl || undefined}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {employee.fullName}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              {[employee.jobRoleName, employee.departmentName].filter(Boolean).join(" • ") || "No details"}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                        </motion.button>
                      ))
                    )}
                  </div>

                  {/* Results count */}
                  {!loading && employees && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-muted-foreground text-center pt-2"
                    >
                      {filteredEmployees.length} of {employees.length} employees
                    </motion.p>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="screens-content"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Screen Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted/30 scrollbar-track-transparent">
                    {screenConfig.map((screen, index) => (
                      <motion.button
                        key={screen.href}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.03, duration: 0.2 }}
                        onClick={() => handleNavigateToScreen(screen.href)}
                        className={cn(
                          "relative group p-4 rounded-2xl text-left overflow-hidden",
                          "bg-white/30 dark:bg-white/5 hover:bg-white/60 dark:hover:bg-white/10",
                          "border border-transparent hover:border-primary/20",
                          "transition-all duration-200"
                        )}
                      >
                        {/* Gradient background on hover */}
                        <div className={cn(
                          "absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity",
                          `bg-gradient-to-br ${screen.color}`
                        )} />
                        
                        <div className="relative">
                          <div className={cn(
                            "inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3",
                            "bg-gradient-to-br",
                            screen.color,
                            "text-white shadow-lg"
                          )}>
                            <screen.icon className="w-5 h-5" />
                          </div>
                          <p className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                            {screen.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {screen.description}
                          </p>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Quick Action */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 pt-4 border-t border-white/20"
                  >
                    <Button
                      onClick={() => handleNavigateToScreen("overview")}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white font-semibold shadow-lg shadow-primary/25"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Go to Full Profile
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

