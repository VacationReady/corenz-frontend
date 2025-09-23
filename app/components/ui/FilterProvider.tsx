"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
} from "react";
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
  | { type: "SET_FILTERS"; filters: Partial<FilterState> };

function filterReducer(state: FilterState, action: FilterAction): FilterState {
  switch (action.type) {
    case "UPDATE_FILTER":
      return {
        ...state,
        [action.key]: action.value,
      };
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
}

export function FilterProvider({
  children,
  initialFilters,
}: FilterProviderProps) {
  const [filters, dispatch] = useReducer(filterReducer, {
    ...initialFilterState,
    ...initialFilters,
  });

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
