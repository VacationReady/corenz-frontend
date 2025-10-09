import { ReviewerRole, TemplateQuestion } from "@/types/performance-templates";

/**
 * Determines the visibility mode for a question based on user role and question permissions
 */
export type QuestionVisibility = "editable" | "readonly" | "hidden";

export interface QuestionPermissionCheck {
  visibility: QuestionVisibility;
  reason?: string;
}

/**
 * Check if a user with a given role can see/edit a specific question
 * @param question - The template question with permission settings
 * @param userRole - The role of the current user (e.g., SELF, MANAGER, PEER)
 * @param isEmployee - Whether the user is the employee being reviewed
 * @returns QuestionPermissionCheck with visibility mode and optional reason
 */
export function checkQuestionPermission(
  question: TemplateQuestion,
  userRole: ReviewerRole,
  isEmployee: boolean = false
): QuestionPermissionCheck {
  const {
    visibleToRoles = [],
    requiredFromRoles = [],
    hideFromEmployee = false,
  } = question;

  // If hideFromEmployee is true and user is the employee, hide it completely
  if (hideFromEmployee && isEmployee) {
    return {
      visibility: "hidden",
      reason: "This question is hidden from employees",
    };
  }

  // If no visibility restrictions are set, it's visible to all (backward compatibility)
  const hasNoRestrictions = visibleToRoles.length === 0 && requiredFromRoles.length === 0;
  
  if (hasNoRestrictions) {
    // Default behavior: everyone can edit unless specifically restricted
    return {
      visibility: "editable",
      reason: "No restrictions set - visible to all",
    };
  }

  // Check if user's role is required to answer
  if (requiredFromRoles.includes(userRole)) {
    return {
      visibility: "editable",
      reason: `Required from ${userRole}`,
    };
  }

  // Check if user's role can at least view
  if (visibleToRoles.includes(userRole)) {
    return {
      visibility: "readonly",
      reason: `Visible to ${userRole} (read-only)`,
    };
  }

  // Not visible to this role
  return {
    visibility: "hidden",
    reason: `Not visible to ${userRole}`,
  };
}

/**
 * Filter questions based on visibility for a specific role
 * @param questions - Array of template questions
 * @param userRole - The role of the current user
 * @param isEmployee - Whether the user is the employee being reviewed
 * @returns Filtered array of questions with their visibility status
 */
export function filterQuestionsByRole(
  questions: TemplateQuestion[],
  userRole: ReviewerRole,
  isEmployee: boolean = false
): Array<TemplateQuestion & { permissionCheck: QuestionPermissionCheck }> {
  return questions
    .map((question) => ({
      ...question,
      permissionCheck: checkQuestionPermission(question, userRole, isEmployee),
    }))
    .filter((q) => q.permissionCheck.visibility !== "hidden");
}

/**
 * Get a summary of question permissions for display
 * @param question - The template question
 * @returns Human-readable summary of permissions
 */
export function getQuestionPermissionSummary(question: TemplateQuestion): string {
  const {
    visibleToRoles = [],
    requiredFromRoles = [],
    hideFromEmployee = false,
  } = question;

  if (hideFromEmployee) {
    return "Hidden from employee";
  }

  if (requiredFromRoles.length === 0 && visibleToRoles.length === 0) {
    return "Visible to all";
  }

  const parts: string[] = [];

  if (requiredFromRoles.length > 0) {
    parts.push(`Required from: ${requiredFromRoles.join(", ")}`);
  }

  if (visibleToRoles.length > 0) {
    const readOnlyRoles = visibleToRoles.filter((r) => !requiredFromRoles.includes(r));
    if (readOnlyRoles.length > 0) {
      parts.push(`Read-only for: ${readOnlyRoles.join(", ")}`);
    }
  }

  return parts.join(" • ");
}

/**
 * Validate that question permissions are logically consistent
 * @param question - The template question to validate
 * @returns Array of validation errors (empty if valid)
 */
export function validateQuestionPermissions(question: TemplateQuestion): string[] {
  const errors: string[] = [];
  const {
    visibleToRoles = [],
    requiredFromRoles = [],
  } = question;

  // All required roles must also be visible
  for (const role of requiredFromRoles) {
    if (!visibleToRoles.includes(role)) {
      errors.push(`Role ${role} is required but not visible`);
    }
  }

  return errors;
}

/**
 * Get the effective visibility for all reviewer roles
 * @param question - The template question
 * @param availableRoles - All possible reviewer roles in the template
 * @returns Map of role to visibility mode
 */
export function getQuestionVisibilityMap(
  question: TemplateQuestion,
  availableRoles: ReviewerRole[]
): Map<ReviewerRole, QuestionVisibility> {
  const map = new Map<ReviewerRole, QuestionVisibility>();
  
  for (const role of availableRoles) {
    const check = checkQuestionPermission(question, role, role === "SELF");
    map.set(role, check.visibility);
  }
  
  return map;
}

