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
    const pathSegments = pathname.split("/").filter(Boolean);

    if (pathSegments.length === 0) {
      return breadcrumbConfigs.dashboard;
    }

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

        const newsSlug = pathSegments[1];
        const newsTitle = dynamicData?.newsTitle || `News Article`;

        return breadcrumbConfigs.newsDetail(newsTitle, newsSlug);

      case "calendar":
        return breadcrumbConfigs.calendar;

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
        };

        return breadcrumbConfigs.settingsSection(
          settingsSectionLabels[settingsSection] || settingsSection,
        );

      default:
        return null;
    }
  }, [pathname, dynamicData, customConfig]);
}
