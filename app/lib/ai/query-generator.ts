/**
 * AI-Powered Database Query Generator
 * Converts natural language to safe Prisma queries
 */

import { openai, AI_CONFIG } from "./openai-client";
import { prisma } from "@/lib/prisma";

export interface QueryResult {
  success: boolean;
  data?: any;
  count?: number;
  explanation: string;
  query: string;
  sqlGenerated?: string;
  error?: string;
}

// Schema information for AI context
const SCHEMA_CONTEXT = `
You are a database query assistant for an HR system. Generate safe, read-only Prisma queries.

CORE MODELS:
- Employee: id, userId, isActive, departmentId, jobRoleId, startDate, contractEndDate, irdNumber, taxCode, salaryAmount, hourlyRate, contractType, employmentType, siteLocation
- User: id, email, firstName, lastName, role, phone  
- Department: id, name, headId
- JobRole: id, name, level

LEAVE & ABSENCE:
- LeaveRequest: id, employeeId, startDate, endDate, approvalStatus, eventCategoryId, dayType, reason
- LeaveEntitlement: id, employeeId, eventCategoryId, totalDays, usedDays, balance
- LeaveApprovalStage: id, leaveRequestId, status, mode, order

DOCUMENTS & COMPLIANCE:
- Document: id, employeeId, name, category, requiresSignature, requiresAck, signatureDueAt
- EmploymentCheck: id, employeeId, typeOfCheck, documentNumber, expiryDate
- DriverLicence: id, employeeId, type, licenceNumber, expiryDate
- TrainingRecord: id, employeeId, courseId, dateCompleted, expiryDate

FORMS:
- Form: id, name, description, formType, isActive, visibleToDepartments, visibleToJobRoles
- FormSubmission: id, formId, employeeId, submittedAt, data
- FormAssignment: id, formId, employeeId, status, dueDate, completedAt

ONBOARDING & OFFBOARDING:
- OnboardingInstance: id, employeeId, templateId, status, startedAt, completedAt
- OnboardingTemplate: id, name, description, isActive
- EmployeeOffboarding: id, employeeId, status, lastWorkingDate, resignationDate, offboardingReason, isVoluntary
- ExitInterview: id, offboardingId, scheduledAt, completed

PERFORMANCE & TRAINING:
- EmployeePerformanceReview: id, employeeId, reviewerId, reviewDate, rating, summary
- Course: id, name, description, duration, isActive
- TrainingProvider: id, name, description

AUTOMATION & TASKS:
- AutomationRule: id, name, description, isActive, triggerType, category, executionCount
- ActionItem: id, title, description, status, priority, dueDate, assignedToId
- AutomationExecution: id, ruleId, status, triggeredAt, errorMessage

NEWS & COMMUNICATION:
- NewsPost: id, title, content, publishedAt, authorId, isPinned, isPublished
- NewsReaction: id, postId, userId, reaction
- NewsBookmark: id, postId, userId

PERMISSIONS & AUDIT:
- PermissionProfile: id, name, description, isDefault, permissions
- EmployeeAuditLog: id, employeeId, section, field, oldValue, newValue, reason, changedById, changedAt
- GlobalAuditLog: id, action, entityType, entityId, userId, changes

MISC:
- EmergencyContact: id, employeeId, name, relationship, phone, email
- Location: id, name, address, city, country
- SavedReport: id, name, description, createdById
- WorkingPattern: id, name, description, type, isActive

Common Queries:
- "Who is on leave next week?" → leaveRequest model with date filters, use findMany
- "What is [Name]'s email?" → employee model, filter by firstName/lastName, use findMany
- "Show pending performance reviews" → employeePerformanceReview model, use findMany
- "List all active forms" → form model where isActive=true, use findMany
- "Who is currently onboarding?" → onboardingInstance model, use findMany
- "Show recent news" → newsPost model ordered by publishedAt, use findMany
- "How many in sales?" → employee model with count
- "What's the total salary cost?" → employee model with aggregate (SUM salaryAmount)
- "What's the average salary?" → employee model with aggregate (AVG salaryAmount)
- "List individuals in sales" → employee model with findMany (NOT count)
- "Show me sales team with salaries" → employee model with findMany (returns salaryAmount field)

Important Rules:
1. ONLY generate SELECT queries (no UPDATE, DELETE, INSERT)
2. ALWAYS filter by companyId for multi-tenancy
3. Use Prisma syntax (findMany, count, aggregate)
4. For name lookups, use firstName/lastName in User relation
5. For leave, use approvalStatus: "APPROVED" for confirmed leave
6. For dates, use gte/lte operators
7. Handle null values safely
8. Return JSON-serializable results
9. For salary totals/costs/sums, use aggregate with _sum.salaryAmount
10. When filtering context is unclear (e.g., "their salaries"), default to all active employees
11. If department/team mentioned, filter by Department relation
12. CRITICAL: "list", "show", "who are" = use findMany (NOT count)
13. When asking for "individuals", "people", "list" = use findMany to return the actual employee data
14. The employee model INCLUDES salaryAmount - always return it when listing employees
`;

export async function generateQuery(
  prompt: string,
  companyId: string,
  userId: string,
  conversationContext?: string
): Promise<QueryResult> {
  try {
    // Build messages with conversation context
    const messages: any[] = [
      {
        role: "system",
        content: SCHEMA_CONTEXT,
      },
    ];

    // Add conversation context if available for follow-up questions
    if (conversationContext) {
      messages.push({
        role: "system",
        content: `Previous conversation context:\n${conversationContext}\n\nUse this context to understand pronouns (their, those, these) and references to previous queries.`,
      });
    }

    messages.push({
      role: "user",
      content: `Generate a Prisma query for: "${prompt}"
          
CompanyId to filter by: ${companyId}

Respond with JSON in this format:
{
  "queryType": "count|findMany|aggregate",
  "model": "employee|user|leaveRequest|etc",
  "operation": "the prisma code to execute",
  "explanation": "what this query does"
}`,
    });

    // Step 1: AI generates the query logic
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.3, // Lower temperature for precise queries
      messages,
      response_format: { type: "json_object" },
    }    );

    const aiResponse = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    // Step 2: Execute the query safely
    const result = await executeSafeQuery(aiResponse, companyId, conversationContext);

    return {
      success: true,
      ...result,
      explanation: aiResponse.explanation || "Query executed successfully",
      query: aiResponse.operation || "",
    };
  } catch (error: any) {
    return {
      success: false,
      explanation: "Failed to generate query",
      query: "",
      error: error.message,
    };
  }
}

async function executeSafeQuery(
  aiResponse: any,
  companyId: string,
  conversationContext?: string
): Promise<Partial<QueryResult>> {
  const { queryType, model, operation } = aiResponse;

  // Safety check: ensure companyId is in the query
  if (!operation.includes(companyId)) {
    throw new Error("Query must filter by companyId for security");
  }

  // Execute based on query type
  try {
    // Parse the operation to extract the Prisma query
    // This is a simplified executor - in production, use a sandbox
    const data = await executeQueryByType(queryType, model, operation, companyId, conversationContext);

    return {
      data,
      count: Array.isArray(data) ? data.length : typeof data === 'number' ? data : undefined,
    };
  } catch (error: any) {
    throw new Error(`Query execution failed: ${error.message}`);
  }
}

async function executeQueryByType(
  queryType: string,
  model: string,
  operation: string,
  companyId: string,
  conversationContext?: string
): Promise<any> {
  // Common queries
  switch (model.toLowerCase()) {
    case "employee":
      if (queryType === "count") {
        const where: any = { companyId };
        
        // Parse filters from operation string
        if (operation.includes("irdNumber") && operation.includes("null")) {
          where.irdNumber = null;
        }
        
        // Check for department filter
        if (operation.includes("Department") || operation.includes("department")) {
          // Extract department name from operation
          const deptMatch = operation.match(/(?:Department|department).*?name.*?["']([^"']+)["']/);
          if (deptMatch) {
            const deptName = deptMatch[1];
            const department = await prisma.department.findFirst({
              where: {
                companyId,
                name: { contains: deptName, mode: 'insensitive' },
              },
            });
            if (department) {
              where.departmentId = department.id;
            }
          }
        }
        
        // Check for job role filter
        if (operation.includes("JobRole") || operation.includes("jobRole")) {
          const roleMatch = operation.match(/(?:JobRole|jobRole).*?name.*?["']([^"']+)["']/);
          if (roleMatch) {
            const roleName = roleMatch[1];
            const jobRole = await prisma.jobRole.findFirst({
              where: {
                companyId,
                name: { contains: roleName, mode: 'insensitive' },
              },
            });
            if (jobRole) {
              where.jobRoleId = jobRole.id;
            }
          }
        }
        
        // Default to active employees only if no specific filters
        if (!where.irdNumber && !where.departmentId && !where.jobRoleId) {
          where.isActive = true;
        }
        
        return await prisma.employee.count({ where });
      }

      if (queryType === "findMany") {
        const where: any = { companyId };
        
        // Check if looking up specific person by name (for email, phone, etc.)
        const nameMatch = operation.match(/(?:firstName|lastName|name).*?["']([^"']+)["']/i);
        if (nameMatch) {
          const searchName = nameMatch[1];
          // Search by first name OR last name
          where.User = {
            OR: [
              { firstName: { contains: searchName, mode: 'insensitive' } },
              { lastName: { contains: searchName, mode: 'insensitive' } },
              { 
                AND: [
                  { firstName: { contains: searchName.split(' ')[0], mode: 'insensitive' } },
                  { lastName: { contains: searchName.split(' ')[1] || searchName.split(' ')[0], mode: 'insensitive' } },
                ],
              },
            ],
          };
        }
        
        // Parse department filter from operation OR conversation context
        let departmentName: string | null = null;
        
        if (operation.includes("Department") || operation.includes("department")) {
          const deptMatch = operation.match(/(?:Department|department).*?name.*?["']([^"']+)["']/);
          if (deptMatch && !nameMatch) { // Only if not already searching by name
            departmentName = deptMatch[1];
          }
        }
        
        // Also check conversation context for department
        if (!departmentName && conversationContext) {
          const contextMatch = conversationContext.match(/(?:departments|teams):\s*([^,\n]+)/i);
          if (contextMatch) {
            departmentName = contextMatch[1].trim();
          }
        }
        
        // Apply department filter if found
        if (departmentName) {
          const department = await prisma.department.findFirst({
            where: {
              companyId,
              name: { contains: departmentName, mode: 'insensitive' },
            },
          });
          if (department) {
            where.departmentId = department.id;
          }
        }
        
        return await prisma.employee.findMany({
          where,
          select: {
            id: true,
            salaryAmount: true,
            hourlyRate: true,
            contractType: true,
            employmentType: true,
            startDate: true,
            isActive: true,
            siteLocation: true,
            User: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
            Department: {
              select: { name: true },
            },
            JobRole: {
              select: { name: true },
            },
          },
          take: 100, // Limit results
        });
      }

      if (queryType === "aggregate") {
        const where: any = { companyId };
        
        // Try to extract department from operation OR conversation context
        let departmentName: string | null = null;
        
        // First check the operation string
        if (operation.includes("Department") || operation.includes("department")) {
          const deptMatch = operation.match(/(?:Department|department).*?name.*?["']([^"']+)["']/);
          if (deptMatch) {
            departmentName = deptMatch[1];
          }
        }
        
        // If not found and we have conversation context, extract from there
        if (!departmentName && conversationContext) {
          const contextMatch = conversationContext.match(/(?:departments|teams):\s*([^,\n]+)/i);
          if (contextMatch) {
            // Get the first mentioned department
            const mentioned = contextMatch[1].trim();
            departmentName = mentioned;
          }
        }
        
        // Apply department filter if found
        if (departmentName) {
          const department = await prisma.department.findFirst({
            where: {
              companyId,
              name: { contains: departmentName, mode: 'insensitive' },
            },
          });
          if (department) {
            where.departmentId = department.id;
          }
        }
        
        // Check for job role filter
        if (operation.includes("JobRole") || operation.includes("jobRole")) {
          const roleMatch = operation.match(/(?:JobRole|jobRole).*?name.*?["']([^"']+)["']/);
          if (roleMatch) {
            const roleName = roleMatch[1];
            const jobRole = await prisma.jobRole.findFirst({
              where: {
                companyId,
                name: { contains: roleName, mode: 'insensitive' },
              },
            });
            if (jobRole) {
              where.jobRoleId = jobRole.id;
            }
          }
        }
        
        // Default to active employees
        where.isActive = true;
        
        // Aggregate salaryAmount
        const result = await prisma.employee.aggregate({
          where,
          _sum: {
            salaryAmount: true,
          },
          _avg: {
            salaryAmount: true,
          },
          _count: {
            id: true,
          },
        });
        
        return {
          totalSalary: result._sum.salaryAmount || 0,
          averageSalary: result._avg.salaryAmount || 0,
          employeeCount: result._count.id || 0,
        };
      }
      break;

    case "leaverequest":
      if (queryType === "count") {
        return await prisma.leaveRequest.count({
          where: {
            companyId,
            approvalStatus: "PENDING",
          },
        });
      }

      if (queryType === "findMany") {
        const where: any = { companyId, approvalStatus: "APPROVED" };
        
        // Handle date filtering for "next week", "this week", "upcoming", etc.
        if (operation.includes("next week") || operation.includes("upcoming") || operation.includes("startDate")) {
          const now = new Date();
          const nextWeek = new Date();
          nextWeek.setDate(now.getDate() + 7);
          
          where.OR = [
            // Starts within the range
            {
              startDate: {
                gte: now,
                lte: nextWeek,
              },
            },
            // Ongoing (started before, ends after now)
            {
              AND: [
                { startDate: { lte: now } },
                { endDate: { gte: now } },
              ],
            },
          ];
        }
        
        return await prisma.leaveRequest.findMany({
          where,
          include: {
            Employee: {
              include: {
                User: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
                Department: {
                  select: { name: true },
                },
              },
            },
            EventCategory: {
              select: { name: true },
            },
          },
          orderBy: { startDate: "asc" },
          take: 100,
        });
      }
      break;

    case "document":
      if (queryType === "count" && operation.includes("expir")) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const [driverCount, trainingCount, checkCount] = await Promise.all([
          prisma.driverLicence.count({
            where: {
              expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
              Employee: { companyId },
            },
          }),
          prisma.trainingRecord.count({
            where: {
              expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
              Employee: { companyId },
            },
          }),
          prisma.employmentCheck.count({
            where: {
              expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
              Employee: { companyId },
            },
          }),
        ]);
        return driverCount + trainingCount + checkCount;
      }
      
      if (queryType === "findMany") {
        return await prisma.document.findMany({
          where: {
            Employee: { companyId },
            ...(operation.includes("requiresSignature") && { requiresSignature: true }),
            ...(operation.includes("requiresAck") && { requiresAck: true }),
          },
          include: {
            Employee: {
              include: {
                User: { select: { firstName: true, lastName: true } },
              },
            },
          },
          take: 100,
        });
      }
      break;

    // FORMS
    case "form":
      if (queryType === "findMany") {
        return await prisma.form.findMany({
          where: {
            companyId,
            ...(operation.includes("isActive") && { isActive: true }),
          },
          select: {
            id: true,
            name: true,
            description: true,
            formType: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });
      }
      break;

    case "formsubmission":
      if (queryType === "findMany") {
        return await prisma.formSubmission.findMany({
          where: { Form: { companyId } },
          include: {
            Employee: {
              include: {
                User: { select: { firstName: true, lastName: true } },
              },
            },
            Form: { select: { name: true } },
          },
          orderBy: { submittedAt: "desc" },
          take: 100,
        });
      }
      break;

    case "formassignment":
      if (queryType === "findMany") {
        return await prisma.formAssignment.findMany({
          where: {
            Form: { companyId },
            ...(operation.includes("pending") && { status: "pending" }),
          },
          include: {
            Employee: {
              include: {
                User: { select: { firstName: true, lastName: true } },
              },
            },
            Form: { select: { name: true } },
          },
          orderBy: { dueDate: "asc" },
          take: 100,
        });
      }
      break;

    // ONBOARDING & OFFBOARDING
    case "onboardinginstance":
      if (queryType === "findMany") {
        return await prisma.onboardingInstance.findMany({
          where: {
            Employee: { companyId },
            ...(operation.includes("pending") && { status: "IN_PROGRESS" }),
          },
          include: {
            Employee: {
              include: {
                User: { select: { firstName: true, lastName: true } },
              },
            },
            OnboardingTemplate: { select: { name: true } },
          },
          orderBy: { startedAt: "desc" },
          take: 100,
        });
      }
      break;

    case "onboardingtemplate":
      if (queryType === "findMany") {
        return await prisma.onboardingTemplate.findMany({
          where: {
            companyId,
            ...(operation.includes("active") && { isActive: true }),
          },
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
          },
          orderBy: { createdAt: "desc" },
        });
      }
      break;

    case "employeeoffboarding":
      if (queryType === "findMany") {
        return await prisma.employeeOffboarding.findMany({
          where: {
            Employee: { companyId },
          },
          include: {
            Employee: {
              include: {
                User: { select: { firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { lastWorkingDate: "asc" },
          take: 100,
        });
      }
      break;

    case "exitinterview":
      if (queryType === "findMany") {
        return await prisma.exitInterview.findMany({
          where: {
            EmployeeOffboarding: { Employee: { companyId } },
          },
          include: {
            EmployeeOffboarding: {
              include: {
                Employee: {
                  include: {
                    User: { select: { firstName: true, lastName: true } },
                  },
                },
              },
            },
          },
          orderBy: { scheduledAt: "asc" },
          take: 100,
        });
      }
      break;

    // PERFORMANCE & TRAINING
    case "employeeperformancereview":
      if (queryType === "findMany") {
        return await prisma.employeePerformanceReview.findMany({
          where: { companyId },
          include: {
            Employee: {
              include: {
                User: { select: { firstName: true, lastName: true } },
              },
            },
            Reviewer: { select: { firstName: true, lastName: true } },
          },
          orderBy: { reviewDate: "desc" },
          take: 100,
        });
      }
      break;

    case "trainingrecord":
      if (queryType === "findMany") {
        return await prisma.trainingRecord.findMany({
          where: { Employee: { companyId } },
          include: {
            Employee: {
              include: {
                User: { select: { firstName: true, lastName: true } },
              },
            },
            Course: { select: { name: true } },
          },
          orderBy: { dateCompleted: "desc" },
          take: 100,
        });
      }
      break;

    case "course":
      if (queryType === "findMany") {
        return await prisma.course.findMany({
          where: {
            companyId,
          },
          select: {
            id: true,
            name: true,
          },
        });
      }
      break;

    // AUTOMATION & TASKS
    case "automationrule":
      if (queryType === "findMany") {
        return await prisma.automationRule.findMany({
          where: {
            companyId,
            ...(operation.includes("active") && { isActive: true }),
          },
          select: {
            id: true,
            name: true,
            description: true,
            isActive: true,
            triggerType: true,
            category: true,
            executionCount: true,
            successCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 100,
        });
      }
      break;

    case "actionitem":
      if (queryType === "findMany") {
        return await prisma.actionItem.findMany({
          where: {
            companyId,
            ...(operation.includes("pending") && { status: "pending" }),
            ...(operation.includes("overdue") && {
              dueDate: { lt: new Date() },
              status: { not: "completed" },
            }),
          },
          include: {
            assignedTo: { select: { firstName: true, lastName: true } },
          },
          orderBy: { dueDate: "asc" },
          take: 100,
        });
      }
      break;

    case "automationexecution":
      if (queryType === "findMany") {
        return await prisma.automationExecution.findMany({
          where: {
            companyId,
            ...(operation.includes("failed") && { status: "FAILED" }),
          },
          include: {
            AutomationRule: { select: { name: true } },
          },
          orderBy: { triggeredAt: "desc" },
          take: 50,
        });
      }
      break;

    // NEWS & COMMUNICATION
    case "newspost":
      if (queryType === "findMany") {
        return await prisma.newsPost.findMany({
          where: {
            companyId,
            ...(operation.includes("published") && { publishedAt: { not: null } }),
          },
          include: {
            User: { select: { firstName: true, lastName: true } },
          },
          orderBy: { publishedAt: "desc" },
          take: 20,
        });
      }
      break;

    // DEPARTMENTS & ROLES
    case "department":
      if (queryType === "findMany") {
        return await prisma.department.findMany({
          where: {
            companyId,
            ...(operation.includes("active") && { active: true }),
          },
          include: {
            User_Department_headIdToUser: { select: { firstName: true, lastName: true } },
          },
        });
      }
      break;

    case "jobrole":
      if (queryType === "findMany") {
        return await prisma.jobRole.findMany({
          where: { companyId },
          select: {
            id: true,
            name: true,
            description: true,
            level: true,
            active: true,
          },
        });
      }
      break;

    // PERMISSIONS & AUDIT
    case "permissionprofile":
      if (queryType === "findMany") {
        return await prisma.permissionProfile.findMany({
          where: { companyId },
          select: {
            id: true,
            name: true,
            description: true,
            builtIn: true,
            permissions: true,
          },
        });
      }
      break;

    case "employeeauditlog":
      if (queryType === "findMany") {
        return await prisma.employeeAuditLog.findMany({
          where: { companyId },
          include: {
            Employee: {
              include: {
                User: { select: { firstName: true, lastName: true } },
              },
            },
            User: { select: { firstName: true, lastName: true } },
          },
          orderBy: { changedAt: "desc" },
          take: 50,
        });
      }
      break;

    // MISC
    case "emergencycontact":
      if (queryType === "findMany") {
        return await prisma.emergencyContact.findMany({
          where: { Employee: { companyId } },
          include: {
            Employee: {
              include: {
                User: { select: { firstName: true, lastName: true } },
              },
            },
          },
          take: 100,
        });
      }
      break;

    case "location":
      if (queryType === "findMany") {
        return await prisma.location.findMany({
          where: { companyId },
          select: {
            id: true,
            name: true,
          },
        });
      }
      break;

    default:
      throw new Error(`Unsupported model: ${model}`);
  }

  throw new Error("Query pattern not recognized");
}

// Predefined safe queries for common questions
export const QUICK_QUERIES = {
  employeesWithoutIRD: (companyId: string) =>
    prisma.employee.count({
      where: { companyId, irdNumber: null },
    }),

  activeEmployeeCount: (companyId: string) =>
    prisma.employee.count({
      where: { companyId, isActive: true },
    }),

  pendingLeaveRequests: (companyId: string) =>
    prisma.leaveRequest.count({
      where: {
        companyId,
        approvalStatus: "PENDING",
      },
    }),

  contractsExpiringInDays: (companyId: string, days: number) => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return prisma.employee.findMany({
      where: {
        companyId,
        isActive: true,
        contractEndDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        User: {
          select: { firstName: true, lastName: true, email: true },
        },
        Department: { select: { name: true } },
      },
    });
  },

  employeesByDepartment: (companyId: string) =>
    prisma.employee.groupBy({
      by: ["departmentId"],
      where: { companyId, isActive: true },
      _count: { id: true },
    }),
};

