/**
 * Survey Anonymization Utility
 * Handles anonymization of employee data in survey responses based on privacy settings
 */

export type AnonymizationLevel = "public" | "department" | "location" | "full";

export interface EmployeeData {
  id: string;
  User?: {
    firstName: string | null;
    lastName: string | null;
    email?: string;
  };
  Department?: {
    name: string;
  } | null;
  JobRole?: {
    name: string;
  } | null;
  locationName?: string;
}

export interface AnonymizedEmployee {
  id?: string;
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  location?: string;
  isAnonymized?: boolean;
}

/**
 * Minimum number of recipients required for anonymous surveys
 * This prevents identification through small sample sizes
 */
export const MINIMUM_ANONYMOUS_RECIPIENTS = 3;

/**
 * Checks if a survey requires minimum recipients validation
 * @param level - The anonymization level
 * @returns Whether minimum recipients validation is required
 */
export function requiresMinimumRecipients(level: AnonymizationLevel): boolean {
  return level !== "public";
}

/**
 * Anonymizes employee data based on the specified anonymization level
 * @param employee - The employee data to anonymize
 * @param level - The anonymization level (public, department, location, full)
 * @param index - Optional index for generating labels like "Recipient 1"
 * @param labelPrefix - Optional prefix for anonymous labels (default: "Respondent")
 * @returns Anonymized employee data object
 */
export function anonymizeEmployeeData(
  employee: EmployeeData | null | undefined,
  level: AnonymizationLevel = "public",
  index?: number,
  labelPrefix: string = "Respondent"
): AnonymizedEmployee | null {
  if (!employee) return null;

  const fullName = employee.User
    ? [employee.User.firstName, employee.User.lastName]
        .filter(Boolean)
        .join(" ") || "Unknown"
    : "Unknown";
  const department = employee.Department?.name || "Unknown";
  const position = employee.JobRole?.name || "Unknown";
  const location = employee.locationName || "Unknown";

  // Generate anonymous label if index is provided
  const anonymousLabel = index !== undefined ? `${labelPrefix} ${index + 1}` : "Anonymous";

  switch (level) {
    case "public":
      // Show all details
      return {
        id: employee.id,
        name: fullName,
        email: employee.User?.email,
        department,
        position,
        location,
        isAnonymized: false,
      };

    case "department":
      // Show department but anonymize individual identity
      return {
        name: anonymousLabel,
        department,
        position,
        isAnonymized: true,
      };

    case "location":
      // Show location but anonymize individual identity
      return {
        name: anonymousLabel,
        location,
        position,
        isAnonymized: true,
      };

    case "full":
      // Fully anonymous - only show anonymous label
      return {
        name: anonymousLabel,
        isAnonymized: true,
      };

    default:
      // Default to public if unknown level
      return {
        id: employee.id,
        name: fullName,
        email: employee.User?.email,
        department,
        position,
        location,
        isAnonymized: false,
      };
  }
}

/**
 * Gets the anonymization level from survey metadata
 * @param metadata - Survey metadata object
 * @returns The anonymization level, defaulting to "public"
 */
export function getAnonymizationLevel(metadata: any): AnonymizationLevel {
  if (!metadata || typeof metadata !== "object") {
    return "public";
  }

  const level = metadata.anonymizationLevel;
  
  if (
    level === "public" ||
    level === "department" ||
    level === "location" ||
    level === "full"
  ) {
    return level;
  }

  return "public";
}

/**
 * Checks if a specific field should be visible based on anonymization level
 * @param field - The field name to check
 * @param level - The anonymization level
 * @returns Whether the field should be visible
 */
export function isFieldVisible(field: string, level: AnonymizationLevel): boolean {
  const visibilityMap: Record<AnonymizationLevel, Set<string>> = {
    public: new Set(["id", "name", "email", "department", "position", "location"]),
    department: new Set(["department", "position"]),
    location: new Set(["location", "position"]),
    full: new Set(["position"]),
  };

  return visibilityMap[level]?.has(field) || false;
}
