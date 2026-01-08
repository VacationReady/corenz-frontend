/**
 * useFeatureToggles Hook
 * 
 * Provides access to tenant-level feature toggles for navigation filtering
 * and conditional rendering based on enabled features.
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

"use client";

import useSWR from "swr";
import { useSession } from "next-auth/react";
import {
  FeatureKey,
  FeatureToggleState,
  FEATURE_TO_PATHS,
  getFeatureKeyForPath,
} from "@/lib/feature-toggles/types";

/**
 * Result interface for the useFeatureToggles hook
 */
export interface UseFeatureTogglesResult {
  /** Whether the feature toggles are still loading */
  isLoading: boolean;
  /** Any error that occurred while fetching */
  error: Error | undefined;
  /** Check if a specific feature is enabled */
  isFeatureEnabled: (featureKey: FeatureKey) => boolean;
  /** The raw feature toggle state object */
  enabledFeatures: FeatureToggleState;
  /** Filter navigation items based on enabled features */
  filterNavItems: <T extends { href: string }>(items: T[]) => T[];
  /** Check if a path should be visible based on feature toggles */
  isPathEnabled: (path: string) => boolean;
}

/**
 * SWR fetcher for feature toggles
 */
async function fetchFeatureToggles(url: string): Promise<FeatureToggleState> {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch feature toggles");
  }

  return response.json();
}

/**
 * Hook to access tenant-level feature toggles
 * 
 * @example
 * ```tsx
 * const { isFeatureEnabled, filterNavItems, isLoading } = useFeatureToggles();
 * 
 * // Check if a specific feature is enabled
 * if (isFeatureEnabled('performance_management')) {
 *   // Show performance-related UI
 * }
 * 
 * // Filter navigation items
 * const filteredNav = filterNavItems(navItems);
 * ```
 */
export function useFeatureToggles(): UseFeatureTogglesResult {
  const { data: session, status } = useSession();
  const companyId = (session as any)?.user?.companyId;

  // Only fetch when we have a valid session with companyId
  const shouldFetch = status === "authenticated" && !!companyId;

  const { data, error, isLoading: swrLoading } = useSWR<FeatureToggleState>(
    shouldFetch ? "/api/settings/feature-toggles" : null,
    fetchFeatureToggles,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute deduplication
      refreshInterval: 300000, // Refresh every 5 minutes to match server cache TTL
    }
  );

  // Default to all features enabled if loading or error (fail-open for better UX)
  const enabledFeatures: FeatureToggleState = data ?? {};

  /**
   * Check if a specific feature is enabled
   * Defaults to true if feature state is unknown (fail-open)
   */
  const isFeatureEnabled = (featureKey: FeatureKey): boolean => {
    // If still loading or no data, default to enabled (fail-open)
    if (!data) return true;
    return enabledFeatures[featureKey] ?? true;
  };

  /**
   * Check if a path should be visible based on feature toggles
   * Returns true if the path is not associated with any feature (core routes)
   * or if the associated feature is enabled
   */
  const isPathEnabled = (path: string): boolean => {
    const featureKey = getFeatureKeyForPath(path);
    // If path is not associated with any feature, it's always enabled
    if (!featureKey) return true;
    return isFeatureEnabled(featureKey);
  };

  /**
   * Filter navigation items based on enabled features
   * Items with hrefs that map to disabled features are removed
   */
  const filterNavItems = <T extends { href: string }>(items: T[]): T[] => {
    // If still loading, return all items (fail-open)
    if (!data) return items;

    return items.filter((item) => {
      // Check if this item's href maps to a feature
      for (const [featureKey, paths] of Object.entries(FEATURE_TO_PATHS)) {
        // Check if the item's href starts with any of the feature's paths
        const matchesFeature = paths.some((path) => {
          // Exact match or starts with path (for nested routes)
          return item.href === path || item.href.startsWith(path + "/");
        });

        if (matchesFeature) {
          // This item is associated with a feature, check if it's enabled
          return enabledFeatures[featureKey] ?? true;
        }
      }

      // Item is not associated with any feature, always show it
      return true;
    });
  };

  return {
    isLoading: status === "loading" || (shouldFetch && swrLoading),
    error,
    isFeatureEnabled,
    enabledFeatures,
    filterNavItems,
    isPathEnabled,
  };
}

export default useFeatureToggles;
