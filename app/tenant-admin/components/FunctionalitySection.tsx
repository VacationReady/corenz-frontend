"use client";

import React, { useState, useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { 
  FEATURE_CATEGORIES, 
  FeatureKey, 
  FeatureToggleState,
  ALL_FEATURE_KEYS 
} from "@/lib/feature-toggles/types";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";

interface FunctionalitySectionProps {
  /** Company ID for API calls (null for create mode) */
  companyId: string | null;
  /** Current toggle states */
  toggles: FeatureToggleState;
  /** Callback when toggles change (for create mode) */
  onTogglesChange?: (toggles: FeatureToggleState) => void;
  /** Whether this is in create mode (checkboxes) vs edit mode (switches) */
  isCreateMode?: boolean;
  /** Whether the section is loading */
  isLoading?: boolean;
}

/**
 * FunctionalitySection Component
 * 
 * Displays feature toggles grouped by category for tenant configuration.
 * Supports two modes:
 * - Edit mode: Toggle switches with immediate persistence to API
 * - Create mode: Checkboxes for selecting initial features
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */
export function FunctionalitySection({
  companyId,
  toggles,
  onTogglesChange,
  isCreateMode = false,
  isLoading = false,
}: FunctionalitySectionProps) {
  const [localToggles, setLocalToggles] = useState<FeatureToggleState>(toggles);
  const [updatingKeys, setUpdatingKeys] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(FEATURE_CATEGORIES.map(c => c.name))
  );

  // Sync local state when props change
  React.useEffect(() => {
    setLocalToggles(toggles);
  }, [toggles]);

  const toggleCategory = useCallback((categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  }, []);

  /**
   * Handle toggle change in edit mode (immediate persistence)
   */
  const handleToggleChange = useCallback(async (featureKey: FeatureKey, enabled: boolean) => {
    if (isCreateMode) {
      // In create mode, just update local state
      const newToggles = { ...localToggles, [featureKey]: enabled };
      setLocalToggles(newToggles);
      onTogglesChange?.(newToggles);
      return;
    }

    if (!companyId) return;

    // Optimistic update
    const previousValue = localToggles[featureKey];
    setLocalToggles(prev => ({ ...prev, [featureKey]: enabled }));
    setUpdatingKeys(prev => new Set(prev).add(featureKey));

    try {
      const response = await fetch(`/api/tenant-admin/feature-toggles/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [featureKey]: enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update feature toggle");
      }

      const data = await response.json();
      
      // Update with server response
      setLocalToggles(data.toggles);
      
      // Show success toast (Requirement 2.4)
      const feature = FEATURE_CATEGORIES
        .flatMap(c => c.features)
        .find(f => f.key === featureKey);
      toast.success(`${feature?.label || featureKey} ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      // Revert on failure (Requirement 2.5)
      setLocalToggles(prev => ({ ...prev, [featureKey]: previousValue }));
      toast.error("Failed to update feature. Please try again.");
      console.error("Toggle update error:", error);
    } finally {
      setUpdatingKeys(prev => {
        const next = new Set(prev);
        next.delete(featureKey);
        return next;
      });
    }
  }, [companyId, isCreateMode, localToggles, onTogglesChange]);

  /**
   * Select all features (create mode only)
   */
  const handleSelectAll = useCallback(() => {
    const allEnabled = ALL_FEATURE_KEYS.reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as FeatureToggleState);
    setLocalToggles(allEnabled);
    onTogglesChange?.(allEnabled);
  }, [onTogglesChange]);

  /**
   * Deselect all features (create mode only)
   */
  const handleSelectNone = useCallback(() => {
    const allDisabled = ALL_FEATURE_KEYS.reduce((acc, key) => {
      acc[key] = false;
      return acc;
    }, {} as FeatureToggleState);
    setLocalToggles(allDisabled);
    onTogglesChange?.(allDisabled);
  }, [onTogglesChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading features...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Functionality</h3>
          <p className="text-sm text-muted-foreground">
            {isCreateMode 
              ? "Select which features to enable for this tenant"
              : "Enable or disable features for this tenant"
            }
          </p>
        </div>
        {isCreateMode && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-sm text-primary hover:underline"
            >
              Select All
            </button>
            <span className="text-muted-foreground">|</span>
            <button
              type="button"
              onClick={handleSelectNone}
              className="text-sm text-primary hover:underline"
            >
              Select None
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {FEATURE_CATEGORIES.map((category) => {
          const isExpanded = expandedCategories.has(category.name);
          const enabledCount = category.features.filter(
            f => localToggles[f.key] ?? true
          ).length;

          return (
            <div
              key={category.name}
              className="rounded-xl border border-gray-200 bg-white overflow-hidden"
            >
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(category.name)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div className="text-left">
                    <span className="font-medium text-foreground">{category.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({enabledCount}/{category.features.length} enabled)
                    </span>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{category.description}</span>
              </button>

              {/* Category Features */}
              {isExpanded && (
                <div className="border-t border-gray-100 divide-y divide-gray-100">
                  {category.features.map((feature) => {
                    const isEnabled = localToggles[feature.key] ?? true;
                    const isUpdating = updatingKeys.has(feature.key);

                    return (
                      <div
                        key={feature.key}
                        className="flex items-center justify-between px-4 py-3 pl-10"
                      >
                        <div className="flex-1">
                          <label
                            htmlFor={`toggle-${feature.key}`}
                            className="font-medium text-sm text-foreground cursor-pointer"
                          >
                            {feature.label}
                          </label>
                          <p className="text-xs text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {isUpdating && (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                          {isCreateMode ? (
                            <input
                              id={`toggle-${feature.key}`}
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) => handleToggleChange(feature.key, e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                          ) : (
                            <Switch
                              id={`toggle-${feature.key}`}
                              checked={isEnabled}
                              onChange={(checked) => handleToggleChange(feature.key, checked)}
                              disabled={isUpdating}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FunctionalitySection;
