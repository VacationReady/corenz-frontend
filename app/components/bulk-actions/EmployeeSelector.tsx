"use client";

import { useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { Badge } from "@/components/ui/Badge";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Search,
  Users,
  Filter,
  ChevronDown,
  UserCheck,
  Building2,
  Briefcase,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";

export interface Option {
  value: string;
  label: string;
}

export interface EmployeeRow {
  id: string;
  name: string;
  email: string;
  departmentId: string | null;
  departmentName?: string | null;
  jobRoleId: string | null;
  jobRoleName?: string | null;
  isActive: boolean;
}

interface EmployeeSelectorProps {
  employees: EmployeeRow[];
  departments: Option[];
  jobRoles: Option[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  maxHeight?: string;
  showFilters?: boolean;
  renderExtraColumns?: (employee: EmployeeRow) => React.ReactNode;
  extraColumnHeaders?: React.ReactNode;
}

export function EmployeeSelector({
  employees,
  departments,
  jobRoles,
  selectedIds,
  onSelectionChange,
  maxHeight = "280px",
  showFilters = true,
  renderExtraColumns,
  extraColumnHeaders,
}: EmployeeSelectorProps) {
  const [filters, setFilters] = useState({
    query: "",
    status: "active" as "all" | "active" | "inactive",
    departments: ["all"] as string[],
    jobRoles: ["all"] as string[],
  });
  const [isExpanded, setIsExpanded] = useState(true);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  const filteredEmployees = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return employees.filter((employee) => {
      if (filters.status === "active" && !employee.isActive) return false;
      if (filters.status === "inactive" && employee.isActive) return false;
      if (!filters.departments.includes("all")) {
        if (!employee.departmentId) return false;
        if (!filters.departments.includes(employee.departmentId)) return false;
      }
      if (!filters.jobRoles.includes("all")) {
        if (!employee.jobRoleId) return false;
        if (!filters.jobRoles.includes(employee.jobRoleId)) return false;
      }
      if (query.length > 0) {
        const haystack = (employee.name + " " + employee.email).toLowerCase().trim();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }, [employees, filters]);

  const allFilteredSelected = useMemo(
    () => filteredEmployees.length > 0 && filteredEmployees.every((emp) => selectedIds.has(emp.id)),
    [filteredEmployees, selectedIds]
  );

  const someFilteredSelected = useMemo(
    () => filteredEmployees.some((emp) => selectedIds.has(emp.id)),
    [filteredEmployees, selectedIds]
  );

  const selectionState = allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false;

  const toggleSelectAllFiltered = useCallback(() => {
    const next = new Set(selectedIds);
    if (allFilteredSelected) {
      filteredEmployees.forEach((emp) => next.delete(emp.id));
    } else {
      filteredEmployees.forEach((emp) => next.add(emp.id));
    }
    onSelectionChange(next);
  }, [allFilteredSelected, filteredEmployees, selectedIds, onSelectionChange]);

  const toggleEmployeeSelection = useCallback((id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) { next.delete(id); } else { next.add(id); }
    onSelectionChange(next);
  }, [selectedIds, onSelectionChange]);

  const clearAllFilters = () => {
    setFilters({ query: "", status: "active", departments: ["all"], jobRoles: ["all"] });
  };

  const hasActiveFilters = filters.query !== "" || filters.status !== "active" || !filters.departments.includes("all") || !filters.jobRoles.includes("all");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">Select Employees</h3>
            <p className="text-xs text-muted-foreground">
              {selectedIds.size > 0 ? (selectedIds.size + " selected from " + filteredEmployees.length + " matching") : (filteredEmployees.length + " employees available")}
            </p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
              <Badge className="bg-primary/10 text-primary border-primary/20 px-3 py-1">
                <UserCheck className="h-3 w-3 mr-1.5" />{selectedIds.size} selected
              </Badge>
            </motion.div>
          )}
          <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden">
            {showFilters && (
              <div className="space-y-3 mb-4">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by name or email..." value={filters.query} onChange={(e) => setFilters((prev) => ({ ...prev, query: e.target.value }))} className="pl-10 h-10 rounded-xl bg-white/50 dark:bg-white/5 border-white/20" />
                    {filters.query && (<button onClick={() => setFilters((prev) => ({ ...prev, query: "" }))} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full transition-colors"><X className="h-3 w-3 text-muted-foreground" /></button>)}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowFiltersPanel(!showFiltersPanel)} className={cn("h-10 px-4 rounded-xl border-white/20", showFiltersPanel && "bg-primary/10 border-primary/30")}>
                    <Filter className="h-4 w-4 mr-2" />Filters{hasActiveFilters && <span className="ml-2 w-2 h-2 rounded-full bg-primary animate-pulse" />}
                  </Button>
                </div>
                <AnimatePresence>
                  {showFiltersPanel && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="grid gap-3 sm:grid-cols-3 p-4 rounded-xl bg-muted/30 border border-white/10">
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><UserCheck className="h-3 w-3" />Status</label>
                          <Select value={filters.status} onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value as "all" | "active" | "inactive" }))}>
                            <SelectTrigger className="h-9 rounded-lg bg-white/50 dark:bg-white/5 border-white/20"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="all">All</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3 w-3" />Departments</label>
                          <MultiSelect options={departments} value={filters.departments} onValueChange={(value) => setFilters((prev) => ({ ...prev, departments: value }))} placeholder="All departments" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Briefcase className="h-3 w-3" />Job Roles</label>
                          <MultiSelect options={jobRoles} value={filters.jobRoles} onValueChange={(value) => setFilters((prev) => ({ ...prev, jobRoles: value }))} placeholder="All job roles" />
                        </div>
                        {hasActiveFilters && (<div className="sm:col-span-3 flex justify-end"><button type="button" onClick={clearAllFilters} className="text-xs text-primary hover:underline">Clear all filters</button></div>)}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="rounded-xl overflow-hidden border border-white/20 shadow-sm">
              <div className="overflow-y-auto" style={{ maxHeight: maxHeight }}>
                <table className="min-w-full divide-y divide-border/50">
                  <thead className="bg-muted/40 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left w-12"><Checkbox checked={selectionState} onCheckedChange={() => toggleSelectAllFiltered()} aria-label="Select all" /></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Employee</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Status</th>
                      {extraColumnHeaders}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 bg-background">
                    {filteredEmployees.length === 0 ? (
                      <tr><td colSpan={3 + (extraColumnHeaders ? 1 : 0)} className="px-4 py-8 text-center"><div className="flex flex-col items-center gap-2"><Users className="h-8 w-8 text-muted-foreground/50" /><p className="text-sm text-muted-foreground">No employees match your filters</p>{hasActiveFilters && <button type="button" onClick={clearAllFilters} className="text-xs text-primary hover:underline">Clear filters</button>}</div></td></tr>
                    ) : (
                      filteredEmployees.map((employee, index) => {
                        const isSelected = selectedIds.has(employee.id);
                        return (
                          <motion.tr key={employee.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.02 }} onClick={() => toggleEmployeeSelection(employee.id)} className={cn("cursor-pointer transition-colors", isSelected ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/30")}>
                            <td className="px-4 py-3"><Checkbox checked={isSelected} onCheckedChange={() => toggleEmployeeSelection(employee.id)} aria-label={"Select " + employee.name} /></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white", isSelected ? "bg-primary" : "bg-gradient-to-br from-gray-400 to-gray-500")}>{employee.name.charAt(0).toUpperCase()}</div>
                                <div><div className="font-medium text-foreground">{employee.name}</div><div className="text-xs text-muted-foreground">{employee.email}</div></div>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell"><Badge variant={employee.isActive ? "default" : "secondary"} className={cn("text-xs", employee.isActive && "bg-emerald-100 text-emerald-700 border-emerald-200")}>{employee.isActive ? "Active" : "Inactive"}</Badge></td>
                            {renderExtraColumns && renderExtraColumns(employee)}
                          </motion.tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {filteredEmployees.length > 0 && (
              <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
                <button type="button" onClick={toggleSelectAllFiltered} className="hover:text-primary transition-colors">{allFilteredSelected ? "Deselect all visible" : "Select all " + filteredEmployees.length + " visible"}</button>
                {selectedIds.size > 0 && <button type="button" onClick={() => onSelectionChange(new Set())} className="hover:text-destructive transition-colors">Clear selection</button>}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
