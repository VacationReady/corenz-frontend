export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterState {
  search: string;
  departments: string[];
  jobRoles: string[];
  status: string[];
  dateRange: { from?: string; to?: string };
  documentTypes: string[];
  authors: string[];
  categories: string[];
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface FilterConfig {
  searchPlaceholder?: string;
  showDepartmentFilter?: boolean;
  showJobRoleFilter?: boolean;
  showStatusFilter?: boolean;
  showDateRangeFilter?: boolean;
  showDocumentTypeFilter?: boolean;
  showAuthorFilter?: boolean;
  showCategoryFilter?: boolean;
  customFilters?: Array<{
    key: keyof FilterState;
    label: string;
    options: FilterOption[];
  }>;
}

export interface FilterContextType {
  filters: FilterState;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof FilterState) => void;
  isFiltered: boolean;
}
