export type FilterOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "ends_with"
  | "greater_than"
  | "less_than"
  | "greater_than_equal"
  | "less_than_equal"
  | "between"
  | "is_null"
  | "is_not_null"
  | "in"
  | "not_in"
  | "date_equals"
  | "date_before"
  | "date_after"
  | "date_between"
  | "date_in_last"
  | "date_in_next";

export interface ReportFilter {
  id?: string;
  field: string;
  operator: FilterOperator;
  value?: unknown;
  value2?: unknown;
}

export interface SortConfig {
  field: string;
  direction: "asc" | "desc";
}

