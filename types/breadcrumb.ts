// /types/breadcrumb.ts

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

export interface BreadcrumbConfig {
  items: BreadcrumbItem[];
}
