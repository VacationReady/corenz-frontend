"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { CollapsibleFilter } from "@/components/ui/CollapsibleFilter";
import { Users, MapPin, Briefcase, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { AudienceFilters } from "@/types/performance-templates";
import { toast } from "sonner";

interface AudienceFilterStepProps {
  filters: AudienceFilters;
  onChange: (filters: AudienceFilters) => void;
}

interface FilterOption {
  id: string;
  name: string;
}

export function AudienceFilterStep({ filters, onChange }: AudienceFilterStepProps) {
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [locations, setLocations] = useState<FilterOption[]>([]);
  const [jobRoles, setJobRoles] = useState<FilterOption[]>([]);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    employeeCount: number;
    details: {
      departments: FilterOption[];
      locations: FilterOption[];
      jobRoles: FilterOption[];
    };
  } | null>(null);

  useEffect(() => {
    loadFilterOptions();
  }, []);

  // Validate audience whenever filters change
  useEffect(() => {
    const hasFilters = 
      (filters.departments && filters.departments.length > 0) ||
      (filters.locations && filters.locations.length > 0) ||
      (filters.jobRoles && filters.jobRoles.length > 0);

    if (hasFilters) {
      validateAudience();
    } else {
      setValidationResult(null);
    }
  }, [filters]);

  const loadFilterOptions = async () => {
    setLoading(true);
    try {
      const [deptRes, locRes, roleRes] = await Promise.all([
        fetch("/api/departments"),
        fetch("/api/locations"),
        fetch("/api/job-roles"),
      ]);

      if (deptRes.ok) {
        const data = await deptRes.json();
        setDepartments(
          Array.isArray(data)
            ? data.map((d: any) => ({ id: String(d.id), name: d.name }))
            : []
        );
      }

      if (locRes.ok) {
        const data = await locRes.json();
        setLocations(
          Array.isArray(data)
            ? data.map((l: any) => ({ id: String(l.id), name: l.name }))
            : []
        );
      }

      if (roleRes.ok) {
        const data = await roleRes.json();
        setJobRoles(
          Array.isArray(data)
            ? data.map((r: any) => ({ id: String(r.id), name: r.name }))
            : []
        );
      }
    } catch (error) {
      console.error("Failed to load filter options:", error);
      toast.error("Failed to load filter options");
    } finally {
      setLoading(false);
    }
  };

  const validateAudience = async () => {
    setValidating(true);
    try {
      const response = await fetch("/api/audience/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departments: filters.departments || [],
          locations: filters.locations || [],
          jobRoles: filters.jobRoles || [],
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result);
      }
    } catch (error) {
      console.error("Failed to validate audience:", error);
    } finally {
      setValidating(false);
    }
  };

  const toggleFilter = (type: keyof AudienceFilters, id: string) => {
    const currentFilters = filters[type] || [];
    const newFilters = currentFilters.includes(id)
      ? currentFilters.filter((f) => f !== id)
      : [...currentFilters, id];

    onChange({
      ...filters,
      [type]: newFilters,
    });
  };

  const clearFilters = (type: keyof AudienceFilters) => {
    onChange({
      ...filters,
      [type]: [],
    });
  };

  const getFilteredOptions = (type: 'departments' | 'locations' | 'jobRoles') => {
    const allOptions = type === 'departments' ? departments : 
                      type === 'locations' ? locations : jobRoles;
    
    // If no previous filters are selected, show all options
    const hasOtherFilters = 
      (type !== 'departments' && filters.departments && filters.departments.length > 0) ||
      (type !== 'locations' && filters.locations && filters.locations.length > 0) ||
      (type !== 'jobRoles' && filters.jobRoles && filters.jobRoles.length > 0);

    if (!hasOtherFilters) {
      return allOptions;
    }

    // If validation result is available, filter options based on what would be valid
    if (validationResult && !validationResult.valid) {
      // Show only options that would make the combination valid
      // This is a simplified approach - in a real implementation, you'd want more sophisticated logic
      return allOptions;
    }

    return allOptions;
  };

  const selectedCount =
    (filters.departments?.length || 0) +
    (filters.locations?.length || 0) +
    (filters.jobRoles?.length || 0);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner size="lg" showText text="Loading filter options..." />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Define Target Audience</CardTitle>
          <CardDescription>
            Choose who this template applies to. Leave filters empty to apply to all employees.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info Banner */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-blue-900">
                  <strong>Optional filters:</strong> You can skip this step to apply the template company-wide, or select specific departments, locations, and roles to target specific groups.
                </p>
              </div>
            </div>
          </div>

          {/* Validation Status */}
          {validationResult && (
            <div className={`rounded-lg border p-4 ${
              validationResult.valid 
                ? "border-green-200 bg-green-50" 
                : "border-red-200 bg-red-50"
            }`}>
              <div className="flex items-start gap-3">
                {validationResult.valid ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    validationResult.valid ? "text-green-900" : "text-red-900"
                  }`}>
                    {validationResult.valid 
                      ? `✓ This template will apply to ${validationResult.employeeCount} employee(s)`
                      : "⚠ No employees match the selected criteria"
                    }
                  </p>
                  {!validationResult.valid && (
                    <p className="text-sm text-red-700 mt-1">
                      Please adjust your selections to target existing employees.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Departments Filter */}
          <CollapsibleFilter
            title="Departments"
            icon={<Users className="h-4 w-4" />}
            options={getFilteredOptions('departments')}
            selectedIds={filters.departments || []}
            onToggle={(id) => toggleFilter("departments", id)}
            onClear={() => clearFilters("departments")}
            placeholder="No departments available"
          />

          {/* Locations Filter */}
          <CollapsibleFilter
            title="Locations"
            icon={<MapPin className="h-4 w-4" />}
            options={getFilteredOptions('locations')}
            selectedIds={filters.locations || []}
            onToggle={(id) => toggleFilter("locations", id)}
            onClear={() => clearFilters("locations")}
            placeholder="No locations available"
          />

          {/* Job Roles Filter */}
          <CollapsibleFilter
            title="Job Roles"
            icon={<Briefcase className="h-4 w-4" />}
            options={getFilteredOptions('jobRoles')}
            selectedIds={filters.jobRoles || []}
            onToggle={(id) => toggleFilter("jobRoles", id)}
            onClear={() => clearFilters("jobRoles")}
            placeholder="No job roles available"
          />
        </CardContent>
      </Card>

      {/* Summary */}
      {selectedCount > 0 && (
        <Card className={`${
          validationResult?.valid 
            ? "border-green-200 bg-green-50" 
            : validationResult?.valid === false
            ? "border-red-200 bg-red-50"
            : "border-primary/50 bg-primary/5"
        }`}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              {validationResult?.valid ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : validationResult?.valid === false ? (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              ) : null}
              Audience Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {validationResult?.valid ? (
                <>This template will apply to <strong>{validationResult.employeeCount} employee(s)</strong> matching your criteria.</>
              ) : validationResult?.valid === false ? (
                <>⚠️ <strong>No employees match</strong> the selected criteria. Please adjust your selections.</>
              ) : (
                <>This template will apply to employees in{" "}
                {filters.departments && filters.departments.length > 0 && (
                  <strong>{filters.departments.length} department(s)</strong>
                )}
                {filters.locations && filters.locations.length > 0 && (
                  <>
                    {filters.departments && filters.departments.length > 0 && ", "}
                    <strong>{filters.locations.length} location(s)</strong>
                  </>
                )}
                {filters.jobRoles && filters.jobRoles.length > 0 && (
                  <>
                    {((filters.departments && filters.departments.length > 0) ||
                      (filters.locations && filters.locations.length > 0)) &&
                      ", "}
                    <strong>{filters.jobRoles.length} job role(s)</strong>
                  </>
                )}
                .</>
              )}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
