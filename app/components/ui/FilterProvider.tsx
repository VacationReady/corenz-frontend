"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { FilterState, FilterContextType } from "@/types/filter";

const initialFilterState: FilterState = {
  search: "",
  departments: [],
  jobRoles: [],
  status: [],
  locations: [],
  dateRange: {},
  documentTypes: [],
  authors: [],
  categories: [],
  sortBy: "",
  sortOrder: "asc",
};

type FilterAction =
  | { type: "UPDATE_FILTER"; key: keyof FilterState; value: any }
  | { type: "CLEAR_FILTERS" }
  | { type: "CLEAR_FILTER"; key: keyof FilterState }
  | { type: "SET_FILTERS"; filters: Partial<FilterState> }
  | { type: "HYDRATE"; filters: FilterState };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "UPDATE_FILTER":
      return {
        ...state,
        [action.key]: action.value,
      };
    case "HYDRATE":
      return action.filters;
    case "CLEAR_FILTERS":
      return initialFilterState;
    case "CLEAR_FILTER":
      return {
        ...state,
        [action.key]: Array.isArray(state[action.key])
          ? []
          : action.key === "dateRange"
            ? {}
            : action.key === "sortOrder"
              ? "asc"
              : "",
      };
    case "SET_FILTERS":
      return {
        ...state,
        ...action.filters,
      };
    default:
      return state;
  }
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: React.ReactNode;
  initialFilters?: Partial<FilterState>;
  persistenceKey?: string; // e.g., "documents-filters" - enables URL and localStorage persistence
  enableUrlSync?: boolean; // Default: true when persistenceKey is provided
  enableLocalStorage?: boolean; // Default: true when persistenceKey is provided
  companyId?: string; // Required for tenant-scoped localStorage persistence
}

/**
 * Serialize filters to URL query params
 */
function serializeFiltersToUrl(filters: FilterState): URLSearchParams {
  const params = new URLSearchParams();
  
  if (filters.search) params.set("search", filters.search);
  if (filters.documentTypes.length > 0 && !filters.documentTypes.includes("all")) {
    params.set("documentTypes", filters.documentTypes.join(","));
  }
  if (filters.categories.length > 0 && !filters.categories.includes("all")) {
    params.set("categories", filters.categories.join(","));
  }
  if (filters.departments.length > 0 && !filters.departments.includes("all")) {
    params.set("departments", filters.departments.join(","));
  }
  if (filters.jobRoles.length > 0 && !filters.jobRoles.includes("all")) {
    params.set("jobRoles", filters.jobRoles.join(","));
  }
  if (filters.status.length > 0) {
    params.set("status", filters.status.join(","));
  }
  if (filters.locations.length > 0) {
    params.set("locations", filters.locations.join(","));
  }
  if (filters.authors.length > 0) {
    params.set("authors", filters.authors.join(","));
  }
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder && filters.sortOrder !== "asc") {
    params.set("sortOrder", filters.sortOrder);
  }
  if (filters.dateRange.from) {
    params.set("dateFrom", filters.dateRange.from.toISOString());
  }
  if (filters.dateRange.to) {
    params.set("dateTo", filters.dateRange.to.toISOString());
  }
  
  return params;
}

/**
 * Deserialize filters from URL query params
 */
function deserializeFiltersFromUrl(searchParams: URLSearchParams): Partial<FilterState> {
  const filters: Partial<FilterState> = {};
  
  const search = searchParams.get("search");
  if (search) filters.search = search;
  
  const documentTypes = searchParams.get("documentTypes");
  if (documentTypes) filters.documentTypes = documentTypes.split(",");
  
  const categories = searchParams.get("categories");
  if (categories) filters.categories = categories.split(",");
  
  const departments = searchParams.get("departments");
  if (departments) filters.departments = departments.split(",");
  
  const jobRoles = searchParams.get("jobRoles");
  if (jobRoles) filters.jobRoles = jobRoles.split(",");
  
  const status = searchParams.get("status");
  if (status) filters.status = status.split(",");
  
  const locations = searchParams.get("locations");
  if (locations) filters.locations = locations.split(",");
  
  const authors = searchParams.get("authors");
  if (authors) filters.authors = authors.split(",");
  
  const sortBy = searchParams.get("sortBy");
  if (sortBy) filters.sortBy = sortBy;
  
  const sortOrder = searchParams.get("sortOrder");
  if (sortOrder === "asc" || sortOrder === "desc") {
    filters.sortOrder = sortOrder;
  }
  
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  if (dateFrom || dateTo) {
    filters.dateRange = {};
    if (dateFrom) filters.dateRange.from = new Date(dateFrom);
    if (dateTo) filters.dateRange.to = new Date(dateTo);
  }
  
  return filters;
}

/**
 * Build tenant-scoped localStorage key
 * Format: {baseKey}:{companyId} to prevent cross-tenant filter leakage
 */
function getTenantScopedKey(baseKey: string, companyId?: string): string {
  if (!companyId) {
    console.warn("[FilterProvider] No companyId provided for tenant-scoped persistence. Filters will not be persisted to localStorage.");
    return "";
  }
  return `${baseKey}:${companyId}`;
}

/**
 * Serialize filters to localStorage with tenant scoping
 */
function saveFiltersToLocalStorage(key: string, filters: FilterState, companyId?: string) {
  const scopedKey = getTenantScopedKey(key, companyId);
  if (!scopedKey) return; // Don't persist without tenant scope
  
  try {
    const serialized = JSON.stringify({
      ...filters,
      dateRange: {
        from: filters.dateRange.from?.toISOString(),
        to: filters.dateRange.to?.toISOString(),
      },
    });
    localStorage.setItem(scopedKey, serialized);
  } catch (error) {
    console.warn("Failed to save filters to localStorage:", error);
  }
}

/**
 * Deserialize filters from localStorage with tenant scoping
 */
function loadFiltersFromLocalStorage(key: string, companyId?: string): Partial<FilterState> | null {
  const scopedKey = getTenantScopedKey(key, companyId);
  if (!scopedKey) return null; // Don't load without tenant scope
  
  try {
    const stored = localStorage.getItem(scopedKey);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Convert date strings back to Date objects
    if (parsed.dateRange) {
      if (parsed.dateRange.from) {
        parsed.dateRange.from = new Date(parsed.dateRange.from);
      }
      if (parsed.dateRange.to) {
        parsed.dateRange.to = new Date(parsed.dateRange.to);
      }
    }
    
    return parsed;
  } catch (error) {
    console.warn("Failed to load filters from localStorage:", error);
    return null;
  }
}

/**
 * Clear all filter persistence keys for a given base key across all tenants
 * Call this on logout to prevent stale filters
 */
export function clearFilterPersistence(baseKey: string) {
  if (typeof window === "undefined") return;
  
  try {
    // Clear all keys matching the pattern {baseKey}:*
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${baseKey}:`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Also clear legacy non-scoped key if it exists
    localStorage.removeItem(baseKey);
  } catch (error) {
    console.warn("Failed to clear filter persistence:", error);
  }
}

/**
 * Clear all document filter persistence (convenience function for logout)
 */
export function clearAllFilterPersistence() {
  if (typeof window === "undefined") return;
  
  // Clear known filter persistence keys
  const knownFilterKeys = [
    "documents-filters",
    "employees-filters",
    "calendar-filters",
    "offboarding-filters",
    "news-filters",
  ];
  
  knownFilterKeys.forEach(key => clearFilterPersistence(key));
}

export function FilterProvider({
  children,
  initialFilters,
  persistenceKey,
  enableUrlSync = !!persistenceKey,
  enableLocalStorage = !!persistenceKey,
  companyId,
}: FilterProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);
  const hasHydratedRef = useRef(false);
  const skipNextSyncRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentCompanyIdRef = useRef(companyId);

  const [filters, dispatch] = useReducer(filterReducer, {
    ...initialFilterState,
    ...initialFilters,
  });

  // Track companyId changes to clear filters on tenant switch
  useEffect(() => {
    if (currentCompanyIdRef.current && companyId && currentCompanyIdRef.current !== companyId) {
      // Tenant switched - clear filters to prevent cross-tenant data leakage
      console.log("[FilterProvider] Tenant switched, clearing filters");
      dispatch({ type: "CLEAR_FILTERS" });
    }
    currentCompanyIdRef.current = companyId;
  }, [companyId]);

  useEffect(() => {
    if (hasHydratedRef.current) return;

    if (!persistenceKey) {
      hasHydratedRef.current = true;
      return;
    }

    let hydratedFilters: FilterState = {
      ...initialFilterState,
      ...initialFilters,
    };

    const urlFilters = enableUrlSync && searchParams
      ? deserializeFiltersFromUrl(searchParams)
      : {};

    const hasUrlFilters = Object.keys(urlFilters).length > 0;

    if (hasUrlFilters) {
      hydratedFilters = { ...hydratedFilters, ...urlFilters };
      skipNextSyncRef.current = true;
      dispatch({ type: "HYDRATE", filters: hydratedFilters });
      hasHydratedRef.current = true;
      return;
    }

    if (enableLocalStorage) {
      if (typeof window === "undefined" || !companyId) {
        return;
      }

      const storedFilters = loadFiltersFromLocalStorage(persistenceKey, companyId);
      if (storedFilters) {
        hydratedFilters = { ...hydratedFilters, ...storedFilters };
        skipNextSyncRef.current = true;
        dispatch({ type: "HYDRATE", filters: hydratedFilters });
      }

      hasHydratedRef.current = true;
      return;
    }

    hasHydratedRef.current = true;
  }, [
    companyId,
    enableLocalStorage,
    enableUrlSync,
    initialFilters,
    persistenceKey,
    searchParams,
  ]);

  const updateFilter = useCallback<
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => void
  >((key, value) => {
    dispatch({ type: "UPDATE_FILTER", key, value });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: "CLEAR_FILTERS" });
  }, []);

  const clearFilter = useCallback((key: keyof FilterState) => {
    dispatch({ type: "CLEAR_FILTER", key });
  }, []);

  const isFiltered = useMemo(() => {
    return (
      filters.search !== "" ||
      filters.departments.length > 0 ||
      filters.jobRoles.length > 0 ||
      filters.status.length > 0 ||
      filters.locations.length > 0 ||
      filters.documentTypes.length > 0 ||
      filters.authors.length > 0 ||
      filters.categories.length > 0 ||
      filters.dateRange.from !== undefined ||
      filters.dateRange.to !== undefined
    );
  }, [filters]);

  // Sync filters to URL and localStorage when they change
  useEffect(() => {
    // Skip sync on initial mount - we just hydrated
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (skipNextSyncRef.current) {
      skipNextSyncRef.current = false;
      return;
    }
    
    if (!persistenceKey) return;
    
    // Debounce sync to avoid excessive updates
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      // Sync to URL
      if (enableUrlSync && pathname) {
        const params = serializeFiltersToUrl(filters);
        const newUrl = params.toString()
          ? `${pathname}?${params.toString()}`
          : pathname;
        router.replace(newUrl, { scroll: false });
      }
      
      // Sync to localStorage (only if companyId is available for tenant scoping)
      if (enableLocalStorage && companyId) {
        saveFiltersToLocalStorage(persistenceKey, filters, companyId);
      }
    }, 150); // Small debounce to batch rapid changes
    
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [filters, persistenceKey, enableUrlSync, enableLocalStorage, router, pathname, companyId]);

  const contextValue = useMemo(
    () => ({
      filters,
      updateFilter,
      clearFilters,
      clearFilter,
      isFiltered,
    }),
    [filters, updateFilter, clearFilters, clearFilter, isFiltered],
  );

  return (
    <FilterContext.Provider value={contextValue}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error("useFilters must be used within a FilterProvider");
  }
  return context;
}
