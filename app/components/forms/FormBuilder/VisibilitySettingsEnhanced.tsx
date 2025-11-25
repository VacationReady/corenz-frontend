"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  Building2, 
  Briefcase, 
  CheckCircle2, 
  Info,
  Users,
  Lock,
  Globe
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VisibilitySettingsEnhancedProps {
  visibleToRoles: string[];
  visibleToDepartments: string[];
  visibleToJobRoles: string[];
  onChange: (visibility: {
    visibleToRoles: string[];
    visibleToDepartments: string[];
    visibleToJobRoles: string[];
  }) => void;
}

interface Department {
  id: string;
  name: string;
}

interface JobRole {
  id: string;
  name: string;
}

const AVAILABLE_ROLES = [
  { value: "ADMIN", label: "Admin", description: "Full system access", icon: Shield, color: "from-violet-500 to-purple-600" },
  { value: "MANAGER", label: "Manager", description: "Team management access", icon: Users, color: "from-blue-500 to-indigo-600" },
  { value: "EMPLOYEE", label: "Employee", description: "Standard user access", icon: Briefcase, color: "from-emerald-500 to-teal-600" },
];

export function VisibilitySettingsEnhanced({
  visibleToRoles,
  visibleToDepartments,
  visibleToJobRoles,
  onChange,
}: VisibilitySettingsEnhancedProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>("roles");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/job-roles"),
        ]);

        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartments(Array.isArray(deptData) ? deptData : []);
        }

        if (roleRes.ok) {
          const roleData = await roleRes.json();
          setJobRoles(Array.isArray(roleData) ? roleData : []);
        }
      } catch (error) {
        console.error("Failed to fetch departments/job roles:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleRoleChange = (role: string, checked: boolean) => {
    const newRoles = checked
      ? [...visibleToRoles, role]
      : visibleToRoles.filter((r) => r !== role);

    onChange({
      visibleToRoles: newRoles,
      visibleToDepartments,
      visibleToJobRoles,
    });
  };

  const handleDepartmentChange = (deptId: string, checked: boolean) => {
    const newDepts = checked
      ? [...visibleToDepartments, deptId]
      : visibleToDepartments.filter((d) => d !== deptId);

    onChange({
      visibleToRoles,
      visibleToDepartments: newDepts,
      visibleToJobRoles,
    });
  };

  const handleJobRoleChange = (roleId: string, checked: boolean) => {
    const newJobRoles = checked
      ? [...visibleToJobRoles, roleId]
      : visibleToJobRoles.filter((r) => r !== roleId);

    onChange({
      visibleToRoles,
      visibleToDepartments,
      visibleToJobRoles: newJobRoles,
    });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-3" />
            <div className="h-20 bg-gray-100 rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Quick Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-3 gap-3">
        <div className="glass-subtle rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{visibleToRoles.length}</div>
          <div className="text-xs text-muted-foreground">Roles</div>
        </div>
        <div className="glass-subtle rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{visibleToDepartments.length || "All"}</div>
          <div className="text-xs text-muted-foreground">Departments</div>
        </div>
        <div className="glass-subtle rounded-2xl p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{visibleToJobRoles.length || "All"}</div>
          <div className="text-xs text-muted-foreground">Job Roles</div>
        </div>
      </motion.div>

      {/* User Roles Section */}
      <motion.div variants={itemVariants}>
        <button
          onClick={() => setExpandedSection(expandedSection === "roles" ? null : "roles")}
          className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/5 border border-violet-200/50 hover:border-violet-300/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/20">
              <Shield className="h-5 w-5" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-foreground">User Roles</h4>
              <p className="text-xs text-muted-foreground">Required • Select who can access</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {visibleToRoles.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-violet-100 text-violet-700 text-xs font-semibold">
                {visibleToRoles.length} selected
              </span>
            )}
            <motion.div
              animate={{ rotate: expandedSection === "roles" ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
        </button>
        
        <AnimatePresence>
          {expandedSection === "roles" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-3">
                {AVAILABLE_ROLES.map((role) => {
                  const isSelected = visibleToRoles.includes(role.value);
                  const Icon = role.icon;
                  return (
                    <motion.label
                      key={role.value}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all",
                        isSelected 
                          ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/10" 
                          : "border-gray-100 hover:border-gray-200 bg-white hover:bg-gray-50/50"
                      )}
                    >
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={isSelected}
                          onChange={(e) => handleRoleChange(role.value, e.target.checked)}
                        />
                        <div className={cn(
                          "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                          isSelected 
                            ? "border-primary bg-primary" 
                            : "border-gray-300"
                        )}>
                          <AnimatePresence>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                              >
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      
                      <div className={cn(
                        "p-2 rounded-xl bg-gradient-to-br text-white",
                        role.color
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">{role.label}</div>
                        <div className="text-xs text-muted-foreground">{role.description}</div>
                      </div>

                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </motion.div>
                      )}
                    </motion.label>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Departments Section */}
      {departments.length > 0 && (
        <motion.div variants={itemVariants}>
          <button
            onClick={() => setExpandedSection(expandedSection === "departments" ? null : "departments")}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-indigo-500/5 border border-blue-200/50 hover:border-blue-300/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-foreground">Departments</h4>
                <p className="text-xs text-muted-foreground">Optional • Leave empty for all</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {visibleToDepartments.length > 0 ? (
                <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                  {visibleToDepartments.length} selected
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                  <Globe className="h-3 w-3" /> All
                </span>
              )}
              <motion.div
                animate={{ rotate: expandedSection === "departments" ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </div>
          </button>
          
          <AnimatePresence>
            {expandedSection === "departments" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 max-h-64 overflow-y-auto space-y-2 glass-subtle rounded-2xl p-4">
                  {departments.map((dept) => {
                    const isSelected = visibleToDepartments.includes(dept.id);
                    return (
                      <label
                        key={dept.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                          isSelected 
                            ? "bg-blue-50 border border-blue-200" 
                            : "hover:bg-gray-50 border border-transparent"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          onChange={(e) => handleDepartmentChange(dept.id, e.target.checked)}
                        />
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                          isSelected 
                            ? "border-blue-500 bg-blue-500" 
                            : "border-gray-300"
                        )}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={cn(
                          "text-sm flex-1 transition-colors",
                          isSelected ? "text-blue-900 font-medium" : "text-foreground"
                        )}>
                          {dept.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Job Roles Section */}
      {jobRoles.length > 0 && (
        <motion.div variants={itemVariants}>
          <button
            onClick={() => setExpandedSection(expandedSection === "jobRoles" ? null : "jobRoles")}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-200/50 hover:border-emerald-300/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                <Briefcase className="h-5 w-5" />
              </div>
              <div className="text-left">
                <h4 className="font-semibold text-foreground">Job Roles</h4>
                <p className="text-xs text-muted-foreground">Optional • Target specific positions</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {visibleToJobRoles.length > 0 ? (
                <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                  {visibleToJobRoles.length} selected
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                  <Globe className="h-3 w-3" /> All
                </span>
              )}
              <motion.div
                animate={{ rotate: expandedSection === "jobRoles" ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </motion.div>
            </div>
          </button>
          
          <AnimatePresence>
            {expandedSection === "jobRoles" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 max-h-64 overflow-y-auto space-y-2 glass-subtle rounded-2xl p-4">
                  {jobRoles.map((role) => {
                    const isSelected = visibleToJobRoles.includes(role.id);
                    return (
                      <label
                        key={role.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                          isSelected 
                            ? "bg-emerald-50 border border-emerald-200" 
                            : "hover:bg-gray-50 border border-transparent"
                        )}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isSelected}
                          onChange={(e) => handleJobRoleChange(role.id, e.target.checked)}
                        />
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                          isSelected 
                            ? "border-emerald-500 bg-emerald-500" 
                            : "border-gray-300"
                        )}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={cn(
                          "text-sm flex-1 transition-colors",
                          isSelected ? "text-emerald-900 font-medium" : "text-foreground"
                        )}>
                          {role.name}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Info Card */}
      <motion.div 
        variants={itemVariants}
        className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/50"
      >
        <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
          <Info className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h5 className="font-semibold text-amber-900 text-sm mb-1">How visibility works</h5>
          <ul className="text-xs text-amber-800 space-y-1">
            <li className="flex items-center gap-2">
              <Lock className="h-3 w-3" /> Users must match <strong>all</strong> selected criteria
            </li>
            <li className="flex items-center gap-2">
              <Globe className="h-3 w-3" /> Empty department/role = visible to all
            </li>
            <li className="flex items-center gap-2">
              <Briefcase className="h-3 w-3" /> Example: Employee + Driver = only employee drivers see this
            </li>
          </ul>
        </div>
      </motion.div>
    </motion.div>
  );
}

