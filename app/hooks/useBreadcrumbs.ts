import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { BreadcrumbConfig, DynamicBreadcrumbData } from "@/types/breadcrumb";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";

export function useBreadcrumbs(
  dynamicData?: DynamicBreadcrumbData,
  customConfig?: BreadcrumbConfig,
): BreadcrumbConfig | null {
  const pathname = usePathname();

  return useMemo(() => {
    // If custom config is provided, use it
    if (customConfig) {
      return customConfig;
    }

    // Handle null pathname
    if (!pathname) {
      return null;
    }

    // Generate breadcrumbs based on current path
    const rawSegments = pathname.split("/").filter(Boolean);

    if (rawSegments.length === 0) {
      return breadcrumbConfigs.dashboard;
    }

    const pathSegments =
      rawSegments[0] === "admin" && rawSegments.length > 1
        ? rawSegments.slice(1)
        : rawSegments;

    const firstSegment = pathSegments[0];

    switch (firstSegment) {
      case "dashboard":
        return breadcrumbConfigs.dashboard;

      case "employees":
        if (pathSegments.length === 1) {
          return breadcrumbConfigs.employees;
        }

        const employeeId = pathSegments[1];
        const employeeName =
          dynamicData?.employeeName || `Employee ${employeeId}`;

        if (pathSegments.length === 2) {
          return breadcrumbConfigs.employeeDetail(employeeName, employeeId);
        }

        const section = pathSegments[2];
        const sectionLabels: Record<string, string> = {
          overview: "Overview",
          leave: "Leave",
          documents: "Documents",
          performance: "Performance",
          onboarding: "Onboarding History",
          "driver-licenses": "Driver Licenses",
          training: "Training",
          "employment-checks": "Employment Checks",
          settings: "Settings",
          forms: "Forms",
          offboarding: "Offboarding",
          "bank-payroll": "Bank & Payroll",
          "emergency-contacts": "Emergency Contacts",
          "employment-details": "Employment Details",
          "multi-stage-approvals": "Multi-stage Approvals",
        };

        return breadcrumbConfigs.employeeSection(
          employeeName,
          employeeId,
          sectionLabels[section] || section,
        );

      case "documents":
        return breadcrumbConfigs.documents;

      case "news":
        if (pathSegments.length === 1) {
          return breadcrumbConfigs.news;
        }

        const _newsSlug = pathSegments[1];
        const newsTitle = dynamicData?.newsTitle || `News Article`;

        return breadcrumbConfigs.newsDetail(newsTitle);

      case "calendar":
        return breadcrumbConfigs.calendar;

      case "employee":
        if (pathSegments.length === 1) {
          return null; // No breadcrumb for just /employee
        }
        
        const employeeSection = pathSegments[1];
        if (employeeSection === "timesheet") {
          return breadcrumbConfigs.employeeTimesheet;
        }
        
        // Handle other employee sections if needed in the future
        return null;

      case "bulk-actions":
        return breadcrumbConfigs.bulkActions;

      case "settings":
        if (pathSegments.length === 1) {
          return breadcrumbConfigs.settings;
        }

        const settingsSection = pathSegments[1];
        const settingsSectionLabels: Record<string, string> = {
          onboarding: "Onboarding",
          holidays: "Holidays & Absence",
          documents: "Documents",
          workflows: "Workflows",
          forms: "Forms & Surveys",
          system: "System",
          permissions: "Permissions",
          "leave-policies": "Leave Policies",
          "expiry-alerts": "Expiry Alerts",
          "event-rules": "Event Rules",
          "automation-rules": "Automation Rules",
          "working-patterns": "Working Patterns",
          "event-manager": "Event Manager",
          "time-tracking": "Time Tracking",
        };

        return breadcrumbConfigs.settingsSection(
          settingsSectionLabels[settingsSection] || settingsSection,
        );

      case "reports":
        if (pathSegments.length === 1) {
          return breadcrumbConfigs.reports;
        }

        const reportsSection = pathSegments[1];
        const reportsSectionLabels: Record<string, string> = {
          builder: "Report Builder",
          create: "Create Report",
          preview: "Preview",
          library: "Library",
        };

        if (reportsSection === "library") {
          return breadcrumbConfigs.reportsLibrary;
        }

        return breadcrumbConfigs.reportsSection(
          reportsSectionLabels[reportsSection] || reportsSection,
        );

      case "offboarding":
        return breadcrumbConfigs.offboarding;

      case "onboarding":
        return breadcrumbConfigs.onboarding;

      case "profile":
        return breadcrumbConfigs.profile;

      case "org-chart":
        return breadcrumbConfigs.orgChart;

      case "assistant":
        return breadcrumbConfigs.assistant;

      default:
        return null;
    }
  }, [pathname, dynamicData, customConfig]);
}

