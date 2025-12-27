"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Users, Building2, Briefcase, MapPin, ChevronDown, X, Check } from "lucide-react";

type AudienceFilter = {
  departments?: string[];
  roles?: string[];
  locations?: string[];
  type?: "all" | "custom";
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

      {/* Summary */}
      {hasCustomAudience && (
        <div className="p-3 bg-muted/50 rounded-xl">
          <p className="text-xs text-muted-foreground">
            Targeting <span className="font-semibold text-foreground">{totalSelected}</span> filter{totalSelected !== 1 ? "s" : ""} selected
          </p>
        </div>
      )}
    </div>
  );
}
