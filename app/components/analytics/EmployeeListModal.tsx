"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Users, 
  MapPin, 
  Building2, 
  Calendar, 
  User,
  Search,
  ChevronRight,
  Mail,
  Clock,
  Briefcase,
  BadgeCheck,
  AlertCircle,
  UserCircle2,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  startDate?: string;
  department?: {
    id: string;
    name: string;
  };
  location?: {
    id: string;
    name: string;
  };
  jobRole?: {
    id: string;
    name: string;
  };
  employmentType?: string;
  contractType?: string;
}

interface EmployeeListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  filterType: "department" | "location" | "jobRole" | "employmentType" | "contractType" | "tenureBand" | "newHires" | "departures" | "contractsExpiring" | "all";
  filterValue: string;
  companyId: string;
}

// Animation variants
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalVariants = {
  hidden: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
  },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 30,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    y: 20,
    transition: { duration: 0.2 }
  }
};

const listItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.03,
      type: "spring" as const,
      stiffness: 300,
      damping: 25,
    }
  })
};

const shimmerVariants = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: { duration: 1.5, repeat: Infinity, ease: "linear" }
  }
};

export function EmployeeListModal({
  isOpen,
  onClose,
  title,
  description,
  filterType,
  filterValue,
  companyId,
}: EmployeeListModalProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen && filterValue) {
      fetchEmployees();
    }
  }, [isOpen, filterType, filterValue, companyId]);

  // Filter employees based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEmployees(employees);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredEmployees(
        employees.filter(
          (emp) =>
            emp.firstName?.toLowerCase().includes(query) ||
            emp.lastName?.toLowerCase().includes(query) ||
            emp.email?.toLowerCase().includes(query) ||
            emp.department?.name?.toLowerCase().includes(query) ||
            emp.jobRole?.name?.toLowerCase().includes(query) ||
            emp.location?.name?.toLowerCase().includes(query)
        )
      );
    }
  }, [searchQuery, employees]);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        filterType,
        filterValue,
        companyId,
      });

      const response = await fetch(`/api/analytics/people/employees?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch employees");
      }

      const data = await response.json();
      setEmployees(data.employees || []);
      setFilteredEmployees(data.employees || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  const getTenureMonths = (startDate?: string) => {
    if (!startDate) return null;
    const start = new Date(startDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return diffMonths;
  };

  const getTenureLabel = (startDate?: string) => {
    const months = getTenureMonths(startDate);
    if (months === null) return "Unknown";
    if (months < 1) return "< 1 month";
    if (months < 12) return `${months} month${months > 1 ? "s" : ""}`;
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    if (remainingMonths === 0) return `${years} year${years > 1 ? "s" : ""}`;
    return `${years}y ${remainingMonths}m`;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0]?.toUpperCase() || "";
    const last = lastName?.[0]?.toUpperCase() || "";
    return first + last || "?";
  };

  // Generate a consistent color based on name
  const getAvatarColor = (firstName?: string, lastName?: string) => {
    const name = `${firstName}${lastName}`;
    const colors = [
      "from-violet-500 to-purple-500",
      "from-blue-500 to-cyan-500",
      "from-emerald-500 to-teal-500",
      "from-orange-500 to-amber-500",
      "from-pink-500 to-rose-500",
      "from-indigo-500 to-blue-500",
      "from-cyan-500 to-emerald-500",
      "from-fuchsia-500 to-pink-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <motion.div
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          
          {/* Modal */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-4xl max-h-[85vh] flex flex-col
              bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
              rounded-3xl shadow-2xl shadow-black/20
              border border-white/20 dark:border-white/10
              overflow-hidden"
          >
            {/* Header */}
            <div className="flex-shrink-0 p-6 pb-4 border-b border-muted/30">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/20 
                      border border-primary/20 shadow-lg shadow-primary/10"
                  >
                    <Users className="w-6 h-6 text-primary" />
                  </motion.div>
                  <div>
                    <motion.h2 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="text-2xl font-bold text-foreground"
                    >
                      {title}
                    </motion.h2>
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.15 }}
                      className="text-sm text-muted-foreground mt-1"
                    >
                      {description}
                    </motion.p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              </div>

              {/* Search Bar */}
              {!loading && employees.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 relative"
                >
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, department, or role..."
                    className="pl-12 h-12 rounded-xl bg-muted/30 border-muted/50 
                      focus:bg-white dark:focus:bg-slate-800 transition-colors"
                  />
                  {searchQuery && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full 
                        bg-muted hover:bg-muted-foreground/20 transition-colors"
                    >
                      <X className="w-4 h-4 text-muted-foreground" />
                    </motion.button>
                  )}
                </motion.div>
              )}
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {loading ? (
                <div className="p-6 space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30"
                    >
                      <Skeleton className="w-14 h-14 rounded-2xl" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-48" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <Skeleton className="h-8 w-24 rounded-full" />
                    </motion.div>
                  ))}
                </div>
              ) : error ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-12 text-center"
                >
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-500/10 
                    flex items-center justify-center mb-4"
                  >
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Unable to load employees
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">{error}</p>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button onClick={fetchEmployees} className="gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Try Again
                    </Button>
                  </motion.div>
                </motion.div>
              ) : filteredEmployees.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-12 text-center"
                >
                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 
                      flex items-center justify-center mb-4"
                  >
                    <UserCircle2 className="w-8 h-8 text-primary" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchQuery ? "No matches found" : "No employees found"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery 
                      ? `No employees matching "${searchQuery}"`
                      : "There are no employees matching this filter criteria."
                    }
                  </p>
                  {searchQuery && (
                    <Button 
                      variant="ghost" 
                      onClick={() => setSearchQuery("")}
                      className="mt-4"
                    >
                      Clear search
                    </Button>
                  )}
                </motion.div>
              ) : (
                <ScrollArea className="h-[calc(85vh-220px)]">
                  <div className="p-6 space-y-3">
                    {filteredEmployees.map((employee, index) => (
                      <motion.div
                        key={employee.id}
                        custom={index}
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.01, x: 4 }}
                        className="group flex items-center gap-4 p-4 rounded-2xl
                          bg-white/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10
                          border border-transparent hover:border-primary/20
                          shadow-sm hover:shadow-lg hover:shadow-primary/5
                          cursor-pointer transition-all duration-200"
                      >
                        {/* Avatar */}
                        <div className={`
                          relative w-14 h-14 rounded-2xl bg-gradient-to-br ${getAvatarColor(employee.firstName, employee.lastName)}
                          flex items-center justify-center shadow-lg
                          group-hover:scale-105 transition-transform duration-200
                        `}>
                          <span className="text-lg font-bold text-white">
                            {getInitials(employee.firstName, employee.lastName)}
                          </span>
                          {/* Status indicator */}
                          <div className={`
                            absolute -bottom-1 -right-1 w-5 h-5 rounded-full 
                            border-2 border-white dark:border-slate-900
                            flex items-center justify-center
                            ${employee.isActive ? "bg-emerald-500" : "bg-slate-400"}
                          `}>
                            {employee.isActive ? (
                              <BadgeCheck className="w-3 h-3 text-white" />
                            ) : (
                              <X className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                        
                        {/* Main Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-foreground truncate">
                              {employee.firstName} {employee.lastName}
                            </h3>
                            <Badge 
                              className={`text-xs ${
                                employee.isActive 
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" 
                                  : "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30"
                              }`}
                            >
                              {employee.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground truncate">
                              {employee.email}
                            </span>
                          </div>
                        </div>

                        {/* Meta Info - Desktop */}
                        <div className="hidden md:flex items-center gap-6">
                          {employee.department && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="p-1.5 rounded-lg bg-violet-500/10">
                                <Building2 className="w-3.5 h-3.5 text-violet-500" />
                              </div>
                              <span className="text-muted-foreground">{employee.department.name}</span>
                            </div>
                          )}
                          {employee.jobRole && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="p-1.5 rounded-lg bg-amber-500/10">
                                <Briefcase className="w-3.5 h-3.5 text-amber-500" />
                              </div>
                              <span className="text-muted-foreground">{employee.jobRole.name}</span>
                            </div>
                          )}
                          {employee.location && (
                            <div className="flex items-center gap-2 text-sm">
                              <div className="p-1.5 rounded-lg bg-cyan-500/10">
                                <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                              </div>
                              <span className="text-muted-foreground">{employee.location.name}</span>
                            </div>
                          )}
                        </div>

                        {/* Tenure & Actions */}
                        <div className="flex items-center gap-3">
                          {employee.startDate && (
                            <div className="hidden lg:flex flex-col items-end">
                              <div className="flex items-center gap-1.5 text-sm">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                <span className="font-medium text-foreground">
                                  {getTenureLabel(employee.startDate)}
                                </span>
                              </div>
                              <span className="text-xs text-muted-foreground">
                                Since {formatDate(employee.startDate)}
                              </span>
                            </div>
                          )}
                          
                          {/* Employment type badges */}
                          <div className="hidden xl:flex flex-col gap-1">
                            {employee.employmentType && (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {employee.employmentType}
                              </Badge>
                            )}
                            {employee.contractType && (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {employee.contractType}
                              </Badge>
                            )}
                          </div>

                          {/* View Profile Link */}
                          <Link href={`/employees/${employee.id}`}>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              className="p-2 rounded-xl bg-primary/10 hover:bg-primary/20 
                                text-primary transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </motion.div>
                          </Link>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Footer */}
            {filteredEmployees.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-shrink-0 px-6 py-4 border-t border-muted/30 
                  bg-gradient-to-r from-muted/30 via-transparent to-muted/30"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm font-medium text-foreground">
                        {filteredEmployees.length === employees.length 
                          ? `${employees.length} employee${employees.length !== 1 ? "s" : ""}`
                          : `${filteredEmployees.length} of ${employees.length} employees`
                        }
                      </span>
                    </div>
                    {searchQuery && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Search className="w-3 h-3" />
                        Filtered
                      </Badge>
                    )}
                  </div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      variant="outline" 
                      onClick={onClose}
                      className="rounded-xl"
                    >
                      Close
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
