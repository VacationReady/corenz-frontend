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

Available Models:
- Employee: id, userId, isActive, departmentId, jobRoleId, startDate, contractEndDate, 
  irdNumber, taxCode, bankAccountNumber, salaryAmount, contractType, employmentType, locationId
- User: id, email, name, firstName, lastName, role (ADMIN|MANAGER|EMPLOYEE), phone
- Department: id, name, companyId
- JobRole: id, name, companyId
- LeaveRequest: id, employeeId, startDate, endDate, status, eventCategoryId
- LeaveEntitlement: id, employeeId, eventCategoryId, balance
- FormSubmission: id, formId, employeeId, submittedAt
- Document: id, employeeId, documentType, expiryDate
- EmployeeOffboarding: id, employeeId, lastWorkingDate, offboardingReason

Important Rules:
1. ONLY generate SELECT queries (no UPDATE, DELETE, INSERT)
2. ALWAYS filter by companyId for multi-tenancy
3. Use Prisma syntax (findMany, count, aggregate, groupBy)
4. Handle null values safely
5. Return JSON-serializable results
`;

export async function generateQuery(
  prompt: string,
  companyId: string,
  userId: string
): Promise<QueryResult> {
  try {
    // Step 1: AI generates the query logic
    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.model,
      temperature: 0.3, // Lower temperature for precise queries
      messages: [
        {
          role: "system",
          content: SCHEMA_CONTEXT,
        },
        {
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
        },
      ],
      response_format: { type: "json_object" },
    });

    const aiResponse = JSON.parse(
      completion.choices[0].message.content || "{}"
    );

    // Step 2: Execute the query safely
    const result = await executeSafeQuery(aiResponse, companyId);

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
  companyId: string
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
    const data = await executeQueryByType(queryType, model, operation, companyId);

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
  companyId: string
): Promise<any> {
  // Common queries
  switch (model.toLowerCase()) {
    case "employee":
      if (queryType === "count") {
        // Count employees without IRD number
        if (operation.includes("irdNumber") && operation.includes("null")) {
          return await prisma.employee.count({
            where: {
              companyId,
              irdNumber: null,
            },
          });
        }
        // Count active employees
        return await prisma.employee.count({
          where: {
            companyId,
            isActive: true,
          },
        });
      }

      if (queryType === "findMany") {
        return await prisma.employee.findMany({
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
              select: { name: true },
            },
            JobRole: {
              select: { name: true },
            },
          },
          take: 100, // Limit results
        });
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
      break;

    case "document":
      // Count expiring documents
      if (queryType === "count" && operation.includes("expir")) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

        return await prisma.document.count({
          where: {
            companyId,
            expiryDate: {
              lte: thirtyDaysFromNow,
              gte: new Date(),
            },
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

