"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Users, Building2, Briefcase, MapPin, ChevronDown, X, Check, Info, AlertTriangle, Loader2 } from "lucide-react";
import { useTenantFetch } from "@/hooks/useTenantFetch";

type AudienceFilter = {
  departments?: string[];
  roles?: string[];
  locations?: string[];
  type?: "all" | "custom";
  matchMode?: "ALL" | "ANY";
};

interface Props {
  value: AudienceFilter;
  onChange: (audience: AudienceFilter) => void;
  refreshKey: number;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface MultiSelectDropdownProps {
  label: string;
  icon: React.ElementType;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder: string;
  iconColor: string;
}

function MultiSelectDropdown({
  label,
  icon: Icon,
  options,
  selected,
  onChange,
  placeholder,
  iconColor,
}: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((s) => s !== option));
  };

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Icon className={cn("w-4 h-4", iconColor)} />
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm",
            "bg-background border border-border rounded-xl",
            "hover:border-primary/50 transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary",
            isOpen && "border-primary ring-2 ring-primary/20"
          )}
        >
          <div className="flex-1 flex flex-wrap gap-1.5 min-h-[24px]">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              selected.slice(0, 3).map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-md"
                >
                  {item}
                  <button
                    type="button"
                    onClick={(e) => removeOption(item, e)}
                    className="hover:bg-primary/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
            {selected.length > 3 && (
              <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-md">
                +{selected.length - 3} more
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform flex-shrink-0",
              isOpen && "rotate-180"
            )}
          />
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            <div className="absolute z-20 w-full mt-1 py-1 bg-card border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto">
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  No options available
                </div>
              ) : (
                options.map((option) => {
                  const isSelected = selected.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleOption(option)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                        "hover:bg-muted/50 transition-colors",
                        isSelected && "bg-primary/5"
                      )}
                    >
                      <div
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                          isSelected
                            ? "bg-primary border-primary"
                            : "border-border"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className={cn(isSelected && "font-medium")}>
                        {option}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AudienceSelector({
  value,
  onChange,
  refreshKey,
}: Props) {
  const tenantFetch = useTenantFetch();
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const { data, error, isLoading } = useSWR(
    ["/api/audience", refreshKey],
    ([url]) => fetcher(url),
    {
      revalidateOnMount: true,
      revalidateIfStale: true,
      revalidateOnFocus: true,
      dedupingInterval: 0,
    },
  );

  const [departments, setDepartments] = useState<string[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    if (data) {
      setDepartments(
        data.departments?.map((d: { id: string; name: string }) => d.name) ||
          [],
      );
      setRoles(
        data.jobRoles?.map((r: { id: string; name: string }) => r.name) || [],
      );
      setLocations(
        data.locations?.map((l: { id: string; name: string }) => l.name) || [],
      );
    }
  }, [data]);

  useEffect(() => {
    if (error) {
      toast.error("Failed to load audience options");
    }
  }, [error]);

  // Set 'all' on mount if nothing selected
  useEffect(() => {
    if (
      !value.type &&
      (!value.departments || value.departments.length === 0) &&
      (!value.roles || value.roles.length === 0) &&
      (!value.locations || value.locations.length === 0)
    ) {
      onChange({ type: "all" });
    }
  }, []);

  const handleDepartmentsChange = (selected: string[]) => {
    onChange({ ...value, departments: selected, type: undefined });
  };

  const handleRolesChange = (selected: string[]) => {
    onChange({ ...value, roles: selected, type: undefined });
  };

  const handleLocationsChange = (selected: string[]) => {
    onChange({ ...value, locations: selected, type: undefined });
  };

  const handleTargetAll = () => {
    onChange({ type: "all" });
  };

  const hasCustomAudience =
    (value.departments && value.departments.length > 0) ||
    (value.roles && value.roles.length > 0) ||
    (value.locations && value.locations.length > 0);

  const totalSelected =
    (value.departments?.length || 0) +
    (value.roles?.length || 0) +
    (value.locations?.length || 0);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Users className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-foreground">Target Audience</h3>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-muted rounded-xl" />
          <div className="h-10 bg-muted rounded-xl" />
          <div className="h-10 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">Target Audience</h3>
            <p className="text-xs text-muted-foreground">
              Select departments, roles, or locations to target this post.
            </p>
          </div>
        </div>
      </div>

      {/* Target All Toggle */}
      <button
        type="button"
        onClick={handleTargetAll}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all",
          value.type === "all"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
            : "bg-background border-border hover:border-primary/30 text-foreground"
        )}
      >
        <div className="flex items-center gap-3">
          <Users className="w-4 h-4" />
          <span className="font-medium text-sm">Target All Employees</span>
        </div>
        {value.type === "all" && (
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
      </button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-2 bg-card text-muted-foreground">or select specific</span>
        </div>
      </div>

      {/* Dropdown Selectors */}
      <div className="space-y-4">
        <MultiSelectDropdown
          label="Departments"
          icon={Building2}
          options={departments}
          selected={value.departments || []}
          onChange={handleDepartmentsChange}
          placeholder="Select departments..."
          iconColor="text-blue-500"
        />

        <MultiSelectDropdown
          label="Roles"
          icon={Briefcase}
          options={roles}
          selected={value.roles || []}
          onChange={handleRolesChange}
          placeholder="Select roles..."
          iconColor="text-violet-500"
        />

        <MultiSelectDropdown
          label="Locations"
          icon={MapPin}
          options={locations}
          selected={value.locations || []}
          onChange={handleLocationsChange}
          placeholder="Select locations..."
          iconColor="text-orange-500"
        />
      </div>

      {/* Audience Match Mode Toggle - Only show when custom filters are selected */}
      {hasCustomAudience && (
        <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border/50">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium text-foreground">Audience Matching</span>
          </div>
          
          <div className="space-y-2">
            <label
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                (value.matchMode === "ALL" || !value.matchMode)
                  ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                  : "bg-background border-border hover:border-primary/30"
              )}
            >
              <input
                type="radio"
                name="matchMode"
                value="ALL"
                checked={value.matchMode === "ALL" || !value.matchMode}
                onChange={() => onChange({ ...value, matchMode: "ALL" })}
                className="mt-0.5 accent-primary"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">Match ALL conditions</span>
                  <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold rounded uppercase">
                    Recommended
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  User must match <strong>every</strong> selected filter to see this post.
                  More precise targeting for specific audiences.
                </p>
              </div>
            </label>

            <label
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                value.matchMode === "ANY"
                  ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20"
                  : "bg-background border-border hover:border-primary/30"
              )}
            >
              <input
                type="radio"
                name="matchMode"
                value="ANY"
                checked={value.matchMode === "ANY"}
                onChange={() => onChange({ ...value, matchMode: "ANY" })}
                className="mt-0.5 accent-primary"
              />
              <div className="flex-1">
                <span className="font-medium text-sm">Match ANY condition</span>
                <p className="text-xs text-muted-foreground mt-1">
                  User must match <strong>at least one</strong> selected filter to see this post.
                  Broader reach across multiple groups.
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Audience Preview Count */}
      <AudiencePreviewCount
        value={value}
        tenantFetch={tenantFetch}
        previewCount={previewCount}
        setPreviewCount={setPreviewCount}
        isLoadingPreview={isLoadingPreview}
        setIsLoadingPreview={setIsLoadingPreview}
      />
    </div>
  );
}

// Separate component for preview count to handle the debounced fetch
function AudiencePreviewCount({
  value,
  tenantFetch,
  previewCount,
  setPreviewCount,
  isLoadingPreview,
  setIsLoadingPreview,
}: {
  value: AudienceFilter;
  tenantFetch: ReturnType<typeof useTenantFetch>;
  previewCount: number | null;
  setPreviewCount: (count: number | null) => void;
  isLoadingPreview: boolean;
  setIsLoadingPreview: (loading: boolean) => void;
}) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch preview when audience changes (debounced)
  useEffect(() => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce the API call
    timeoutRef.current = setTimeout(async () => {
      setIsLoadingPreview(true);
      try {
        const res = await tenantFetch("/api/news/audience-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            audience: value,
            matchMode: value.matchMode || "ALL",
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setPreviewCount(data.count);
        }
      } catch (err) {
        console.error("Failed to fetch audience preview:", err);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 500);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    value.type,
    value.matchMode,
    JSON.stringify(value.departments),
    JSON.stringify(value.roles),
    JSON.stringify(value.locations),
    tenantFetch,
    setPreviewCount,
    setIsLoadingPreview,
  ]);

  const hasCustomAudience =
    (value.departments && value.departments.length > 0) ||
    (value.roles && value.roles.length > 0) ||
    (value.locations && value.locations.length > 0);

  const totalSelected =
    (value.departments?.length || 0) +
    (value.roles?.length || 0) +
    (value.locations?.length || 0);

  return (
    <div className="space-y-3">
      {/* Preview Count */}
      <div className={cn(
        "p-4 rounded-xl border transition-all",
        previewCount === 0
          ? "bg-amber-500/10 border-amber-500/30"
          : "bg-muted/30 border-border/50"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLoadingPreview ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : previewCount === 0 ? (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            ) : (
              <Users className="w-4 h-4 text-emerald-500" />
            )}
            <span className="text-sm font-medium">
              {isLoadingPreview ? (
                "Calculating..."
              ) : previewCount === null ? (
                "Select audience"
              ) : (
                <>
                  This post will be visible to{" "}
                  <span className={cn(
                    "font-bold",
                    previewCount === 0 ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {previewCount}
                  </span>
                  {" "}user{previewCount !== 1 ? "s" : ""}
                </>
              )}
            </span>
          </div>
        </div>

        {previewCount === 0 && !isLoadingPreview && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            No users match the current filters. Consider adjusting your audience selection
            {value.matchMode === "ALL" && hasCustomAudience && (
              <> or switching to "Match ANY condition" for broader reach</>
            )}
          </p>
        )}
      </div>

      {/* Summary */}
      {hasCustomAudience && (
        <div className="p-3 bg-muted/50 rounded-xl">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{totalSelected}</span> filter{totalSelected !== 1 ? "s" : ""} selected
            {" · "}
            <span className="font-medium">
              {value.matchMode === "ANY" ? "OR" : "AND"} logic
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
