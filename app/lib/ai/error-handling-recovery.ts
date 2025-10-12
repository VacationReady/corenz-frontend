/**
 * Enhanced Error Handling & Recovery System
 * Provides graceful degradation, self-healing, and intelligent error messages
 */

import { prisma } from "@/lib/prisma";

export interface RecoveryAttempt {
  method: string;
  description: string;
  success: boolean;
  result?: any;
  error?: string;
}

export interface EnhancedError {
  type: "not_found" | "ambiguous" | "permission" | "validation" | "system";
  severity: "low" | "medium" | "high" | "critical";
  userMessage: string;
  technicalDetails?: string;
  suggestions?: string[];
  recoveryAttempts?: RecoveryAttempt[];
  canRetry: boolean;
  retryStrategy?: string;
}

/**
 * Try multiple strategies to find an employee when initial search fails
 */
export async function recoverEmployeeSearch(
  searchTerm: string,
  companyId: string
): Promise<{
  found: boolean;
  employees?: any[];
  method?: string;
  error?: EnhancedError;
}> {
  const attempts: RecoveryAttempt[] = [];
  
  // Attempt 1: Exact match (already tried, but document it)
  attempts.push({
    method: "exact_match",
    description: `Searched for exact match: "${searchTerm}"`,
    success: false,
  });

  // Attempt 2: Case-insensitive partial match on first/last name
  try {
    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        OR: [
          {
            User: {
              firstName: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
          {
            User: {
              lastName: {
                contains: searchTerm,
                mode: "insensitive",
              },
            },
          },
        ],
      },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Department: {
          select: {
            name: true,
          },
        },
        JobRole: {
          select: {
            name: true,
          },
        },
      },
      take: 10,
    });

    if (employees.length > 0) {
      attempts.push({
        method: "partial_match",
        description: `Found ${employees.length} employees with partial name match`,
        success: true,
        result: employees,
      });

      return {
        found: true,
        employees,
        method: "partial_match",
      };
    }

    attempts.push({
      method: "partial_match",
      description: "No employees found with partial name match",
      success: false,
    });
  } catch (error: any) {
    attempts.push({
      method: "partial_match",
      description: "Partial match search failed",
      success: false,
      error: error.message,
    });
  }

  // Attempt 3: Fuzzy match (Levenshtein distance approximation)
  try {
    const allEmployees = await prisma.employee.findMany({
      where: { companyId },
      include: {
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Department: {
          select: {
            name: true,
          },
        },
      },
      take: 100, // Limit for performance
    });

    const fuzzyMatches = allEmployees
      .map((emp) => ({
        ...emp,
        fullName: `${emp.User.firstName} ${emp.User.lastName}`,
        distance: levenshteinDistance(
          searchTerm.toLowerCase(),
          `${emp.User.firstName} ${emp.User.lastName}`.toLowerCase()
        ),
      }))
      .filter((emp) => emp.distance <= 3) // Allow up to 3 character differences
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);

    if (fuzzyMatches.length > 0) {
      attempts.push({
        method: "fuzzy_match",
        description: `Found ${fuzzyMatches.length} potential matches using fuzzy search`,
        success: true,
        result: fuzzyMatches,
      });

      return {
        found: true,
        employees: fuzzyMatches,
        method: "fuzzy_match",
      };
    }

    attempts.push({
      method: "fuzzy_match",
      description: "No close matches found with fuzzy search",
      success: false,
    });
  } catch (error: any) {
    attempts.push({
      method: "fuzzy_match",
      description: "Fuzzy search failed",
      success: false,
      error: error.message,
    });
  }

  // Attempt 4: Search by email if searchTerm looks like email
  if (searchTerm.includes("@")) {
    try {
      const employees = await prisma.employee.findMany({
        where: {
          companyId,
          User: {
            email: {
              contains: searchTerm,
              mode: "insensitive",
            },
          },
        },
        include: {
          User: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          Department: {
            select: {
              name: true,
            },
          },
        },
      });

      if (employees.length > 0) {
        attempts.push({
          method: "email_search",
          description: `Found ${employees.length} employees by email`,
          success: true,
          result: employees,
        });

        return {
          found: true,
          employees,
          method: "email_search",
        };
      }

      attempts.push({
        method: "email_search",
        description: "No employees found by email",
        success: false,
      });
    } catch (error: any) {
      attempts.push({
        method: "email_search",
        description: "Email search failed",
        success: false,
        error: error.message,
      });
    }
  }

  // All attempts failed - return enhanced error
  return {
    found: false,
    error: {
      type: "not_found",
      severity: "medium",
      userMessage: `I couldn't find an employee matching "${searchTerm}".`,
      suggestions: [
        "Check the spelling of the name",
        "Try using first name only or last name only",
        "Try using their email address instead",
        "Ask me to 'list all employees' to find the correct name",
      ],
      recoveryAttempts: attempts,
      canRetry: true,
      retryStrategy: "Try a different name or use 'list all employees'",
    },
  };
}

/**
 * Try multiple strategies to find a department when initial search fails
 */
export async function recoverDepartmentSearch(
  searchTerm: string,
  companyId: string
): Promise<{
  found: boolean;
  departments?: any[];
  method?: string;
  error?: EnhancedError;
}> {
  const attempts: RecoveryAttempt[] = [];

  // Attempt 1: Exact match (already failed)
  attempts.push({
    method: "exact_match",
    description: `Searched for exact match: "${searchTerm}"`,
    success: false,
  });

  // Attempt 2: Partial case-insensitive match
  try {
    const departments = await prisma.department.findMany({
      where: {
        companyId,
        name: {
          contains: searchTerm,
          mode: "insensitive",
        },
      },
      include: {
        _count: {
          select: {
            Employees: true,
          },
        },
      },
    });

    if (departments.length > 0) {
      attempts.push({
        method: "partial_match",
        description: `Found ${departments.length} departments with partial match`,
        success: true,
        result: departments,
      });

      return {
        found: true,
        departments: departments.map(d => ({
          ...d,
          employeeCount: d._count.Employees,
        })),
        method: "partial_match",
      };
    }

    attempts.push({
      method: "partial_match",
      description: "No departments found with partial match",
      success: false,
    });
  } catch (error: any) {
    attempts.push({
      method: "partial_match",
      description: "Partial match search failed",
      success: false,
      error: error.message,
    });
  }

  // Attempt 3: Synonym matching
  const synonymMap: Record<string, string[]> = {
    "sales": ["sales", "sales & marketing", "business development", "revenue"],
    "engineering": ["engineering", "software engineering", "development", "tech", "it"],
    "hr": ["hr", "human resources", "people", "people & culture"],
    "finance": ["finance", "accounting", "financial", "accounts"],
    "marketing": ["marketing", "sales & marketing", "brand", "communications"],
  };

  const searchLower = searchTerm.toLowerCase();
  for (const [key, synonyms] of Object.entries(synonymMap)) {
    if (synonyms.some(syn => searchLower.includes(syn))) {
      try {
        const departments = await prisma.department.findMany({
          where: {
            companyId,
            OR: synonyms.map(syn => ({
              name: {
                contains: syn,
                mode: "insensitive",
              },
            })),
          },
          include: {
            _count: {
              select: {
                Employees: true,
              },
            },
          },
        });

        if (departments.length > 0) {
          attempts.push({
            method: "synonym_match",
            description: `Found ${departments.length} departments using synonyms`,
            success: true,
            result: departments,
          });

          return {
            found: true,
            departments: departments.map(d => ({
              ...d,
              employeeCount: d._count.Employees,
            })),
            method: "synonym_match",
          };
        }
      } catch (error: any) {
        attempts.push({
          method: "synonym_match",
          description: "Synonym search failed",
          success: false,
          error: error.message,
        });
      }
      break;
    }
  }

  // All attempts failed
  const allDepartments = await prisma.department.findMany({
    where: { companyId },
    take: 10,
  });

  return {
    found: false,
    error: {
      type: "not_found",
      severity: "medium",
      userMessage: `I couldn't find a department matching "${searchTerm}".`,
      suggestions: [
        "Check the spelling of the department name",
        `Available departments: ${allDepartments.map(d => d.name).join(", ")}`,
        "Try a different name or abbreviation",
      ],
      recoveryAttempts: attempts,
      canRetry: true,
      retryStrategy: "Try one of the available department names listed above",
    },
  };
}

/**
 * Calculate Levenshtein distance between two strings
 * (measure of how many single-character edits are needed)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Generate user-friendly error message with actionable suggestions
 */
export function generateFriendlyErrorMessage(
  error: Error,
  context: {
    action?: string;
    entity?: string;
    userInput?: string;
  }
): string {
  const { action, entity, userInput } = context;

  // Prisma-specific errors
  if (error.message.includes("Record to update not found")) {
    return `I couldn't find that ${entity || "record"} to update. It may have been deleted or the ID is incorrect. Please try searching for it again.`;
  }

  if (error.message.includes("Unique constraint failed")) {
    const field = extractFieldFromError(error.message);
    return `A ${entity || "record"} with that ${field} already exists. Please use a different ${field}.`;
  }

  if (error.message.includes("Foreign key constraint failed")) {
    return `This ${action} can't be completed because it would break a relationship with other data. Please check related records first.`;
  }

  // OpenAI-specific errors
  if (error.message.includes("rate_limit_exceeded")) {
    return `We're getting too many requests right now. Please wait a minute and try again. You can also try refreshing the page.`;
  }

  if (error.message.includes("insufficient_quota") || error.message.includes("billing")) {
    return `AI features are temporarily unavailable due to billing issues. Please contact your administrator.`;
  }

  // Network errors
  if (error.message.includes("ECONNREFUSED") || error.message.includes("Network")) {
    return `I'm having trouble connecting to the system. Please check your internet connection and try again.`;
  }

  // Validation errors
  if (error.message.includes("invalid") || error.message.includes("validation")) {
    return `The ${entity || "data"} you provided doesn't look quite right. ${error.message}`;
  }

  // Permission errors
  if (error.message.includes("permission") || error.message.includes("unauthorized")) {
    return `You don't have permission to ${action || "do that"}. Please contact your administrator if you think this is wrong.`;
  }

  // Generic fallback
  return `Something went wrong${action ? ` while trying to ${action}` : ""}. ${error.message.slice(0, 200)}${error.message.length > 200 ? "..." : ""}`;
}

/**
 * Extract field name from Prisma error message
 */
function extractFieldFromError(errorMessage: string): string {
  const match = errorMessage.match(/fields: \(`(\w+)`\)/);
  return match ? match[1] : "value";
}

/**
 * Determine if an error is recoverable
 */
export function isRecoverableError(error: Error): boolean {
  const recoverablePatterns = [
    "not found",
    "no results",
    "empty",
    "ambiguous",
    "multiple matches",
    "rate limit",
    "timeout",
    "ECONNREFUSED",
  ];

  return recoverablePatterns.some((pattern) =>
    error.message.toLowerCase().includes(pattern.toLowerCase())
  );
}

/**
 * Suggest recovery actions based on error type
 */
export function suggestRecoveryActions(error: Error): string[] {
  const suggestions: string[] = [];

  if (error.message.includes("not found")) {
    suggestions.push("Check the spelling and try again");
    suggestions.push("Try using a different search term");
    suggestions.push("List all options to find the correct one");
  }

  if (error.message.includes("rate limit")) {
    suggestions.push("Wait a minute and try again");
    suggestions.push("Refresh the page");
    suggestions.push("Contact support if problem persists");
  }

  if (error.message.includes("permission") || error.message.includes("unauthorized")) {
    suggestions.push("Check if you have admin access");
    suggestions.push("Contact your system administrator");
    suggestions.push("Try logging out and back in");
  }

  if (error.message.includes("validation") || error.message.includes("invalid")) {
    suggestions.push("Check your input format");
    suggestions.push("Review the example format");
    suggestions.push("Try simplifying your request");
  }

  return suggestions;
}

