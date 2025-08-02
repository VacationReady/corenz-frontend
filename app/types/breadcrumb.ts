export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

export interface BreadcrumbConfig {
  items: BreadcrumbItem[];
}

export interface DynamicBreadcrumbData {
  employeeName?: string;
  documentTitle?: string;
  newsTitle?: string;
  departmentName?: string;
  jobRoleName?: string;
}
