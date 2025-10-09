"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Users, MapPin, Briefcase, Info } from "lucide-react";
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
  const [departments, setDepartments] = useState<FilterOption[]>([]);
  const [locations, setLocations] = useState<FilterOption[]>([]);
  const [jobRoles, setJobRoles] = useState<FilterOption[]>([]);

  useEffect(() => {
    loadFilterOptions();
  }, []);

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

          {/* Departments Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Users className="h-4 w-4" />
                Departments
                {filters.departments && filters.departments.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.departments.length} selected
                  </Badge>
                )}
              </Label>
              {filters.departments && filters.departments.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilters("departments")}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {departments.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">
                  No departments available
                </p>
              ) : (
                departments.map((dept) => {
                  const isSelected = filters.departments?.includes(dept.id);
                  return (
                    <button
                      key={dept.id}
                      onClick={() => toggleFilter("departments", dept.id)}
                      className={`p-3 text-left rounded-lg border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-sm" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{dept.name}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Locations Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <MapPin className="h-4 w-4" />
                Locations
                {filters.locations && filters.locations.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.locations.length} selected
                  </Badge>
                )}
              </Label>
              {filters.locations && filters.locations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilters("locations")}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {locations.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">
                  No locations available
                </p>
              ) : (
                locations.map((loc) => {
                  const isSelected = filters.locations?.includes(loc.id);
                  return (
                    <button
                      key={loc.id}
                      onClick={() => toggleFilter("locations", loc.id)}
                      className={`p-3 text-left rounded-lg border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-sm" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{loc.name}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Job Roles Filter */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="flex items-center gap-2 text-base font-semibold">
                <Briefcase className="h-4 w-4" />
                Job Roles
                {filters.jobRoles && filters.jobRoles.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filters.jobRoles.length} selected
                  </Badge>
                )}
              </Label>
              {filters.jobRoles && filters.jobRoles.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearFilters("jobRoles")}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {jobRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-full">
                  No job roles available
                </p>
              ) : (
                jobRoles.map((role) => {
                  const isSelected = filters.jobRoles?.includes(role.id);
                  return (
                    <button
                      key={role.id}
                      onClick={() => toggleFilter("jobRoles", role.id)}
                      className={`p-3 text-left rounded-lg border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <div className="w-2 h-2 bg-white rounded-sm" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{role.name}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {selectedCount > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Audience Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This template will apply to employees in{" "}
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
              .
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
