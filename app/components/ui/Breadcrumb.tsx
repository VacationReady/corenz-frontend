"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

// ✅ Define BreadcrumbItem inline instead of importing from a missing types file
export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCurrentPage?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
  showHomeIcon?: boolean;
}

export function Breadcrumb({
  items,
  className,
  showHomeIcon = true,
}: BreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={cn(
        "flex items-center space-x-1 text-sm text-muted-foreground",
        className,
      )}
    >
      <ol className="flex items-center space-x-1">
        {showHomeIcon && (
          <li>
            <Link
              href="/dashboard"
              className="flex items-center hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm"
              aria-label="Go to dashboard"
            >
              <Home className="w-4 h-4" />
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrentPage = item.isCurrentPage || isLast;

          return (
            <React.Fragment key={index}>
              {(showHomeIcon || index > 0) && (
                <li aria-hidden="true">
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                </li>
              )}

              <li>
                {item.href && !isCurrentPage ? (
                  <Link
                    href={item.href}
                    className="hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-1 py-0.5"
                    aria-current={isCurrentPage ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={cn(
                      "px-1 py-0.5",
                      isCurrentPage && "text-foreground font-medium",
                    )}
                    aria-current={isCurrentPage ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

// ✅ Predefined breadcrumb configurations for common pages
export const breadcrumbConfigs = {
  dashboard: {
    items: [{ label: "Dashboard", isCurrentPage: true }],
  },
  employees: {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Employees", isCurrentPage: true },
    ],
  },
  employeeDetail: (employeeName: string, _employeeId: string) => ({
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Employees", href: "/employees" },
      { label: employeeName, isCurrentPage: true },
    ],
  }),
  employeeSection: (
    employeeName: string,
    employeeId: string,
    section: string,
  ) => ({
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Employees", href: "/employees" },
      { label: employeeName, href: `/employees/${employeeId}/overview` },
      { label: section, isCurrentPage: true },
    ],
  }),
  documents: {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Documents", isCurrentPage: true },
    ],
  },
  news: {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "News", isCurrentPage: true },
    ],
  },
  newsDetail: (newsTitle: string) => ({
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "News", href: "/news" },
      { label: newsTitle, isCurrentPage: true },
    ],
  }),
  calendar: {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Calendar", isCurrentPage: true },
    ],
  },
  settings: {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", isCurrentPage: true },
    ],
  },
  settingsSection: (section: string) => ({
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/settings" },
      { label: section, isCurrentPage: true },
    ],
  }),
  // Reports section
  reports: {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reports", isCurrentPage: true },
    ],
  },
  reportsSection: (section: string) => ({
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Reports", href: "/reports" },
      { label: section, isCurrentPage: true },
    ],
  }),
  // Offboarding section
  offboarding: {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Offboarding", isCurrentPage: true },
    ],
  },
  // Onboarding section  
  onboarding: {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Onboarding", isCurrentPage: true },
    ],
  },
  // Profile section
  profile: {
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Profile", isCurrentPage: true },
    ],
  },
  // Form-specific breadcrumbs
  formDetail: (formName: string) => ({
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Settings", href: "/settings" },
      { label: "Forms & Surveys", href: "/settings/forms" },
      { label: formName, isCurrentPage: true },
    ],
  }),
  // Employee form breadcrumbs
  employeeForm: (employeeName: string, employeeId: string, formName: string) => ({
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Employees", href: "/employees" },
      { label: employeeName, href: `/employees/${employeeId}/overview` },
      { label: formName, isCurrentPage: true },
    ],
  }),
  // Training breadcrumbs
  employeeTraining: (employeeName: string, employeeId: string, section?: string) => ({
    items: [
      { label: "Dashboard", href: "/dashboard" },
      { label: "Employees", href: "/employees" },
      { label: employeeName, href: `/employees/${employeeId}/overview` },
      { label: "Training", href: `/employees/${employeeId}/training` },
      ...(section ? [{ label: section, isCurrentPage: true }] : []),
    ],
  }),
};
