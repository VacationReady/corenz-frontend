/**
 * AI-Powered Database Query Generator
 * Converts natural language to safe Prisma queries
 */

import { openai, AI_CONFIG } from "./openai-client";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ApprovalStatus } from "@prisma/client";
import { findEmployeeByName } from "./system-context";

export interface QueryResult {
  success: boolean;
  data?: any;
  count?: number;
  explanation: string;
  query: string;
  sqlGenerated?: string;
  error?: string;
  chartConfig?: ChartConfig;
  meta?: Record<string, any>;
}

export interface ChartConfig {
  type: "bar" | "pie" | "line";
  data: any[];
  title?: string;
  description?: string;
  xKey?: string;
  yKey?: string;
  labelKey?: string;
  valueKey?: string;
  colors?: string[];
}

// Schema information for AI context
const SCHEMA_CONTEXT = `
You are a database query assistant for an HR system. Generate safe, read-only Prisma queries.

CORE MODELS:
- Employee: id, userId, isActive, departmentId, jobRoleId, startDate, contractEndDate, irdNumber, taxCode, salaryAmount, hourlyRate, contractType, employmentType, siteLocation
- User: id, email, firstName, lastName, role, phone, dateOfBirth, addressCity, addressCountry, genderOptionId, managerId (self-referential for reporting structure)
- Department: id, name, headId
- JobRole: id, name, level
- GenderOption: id, key, label (e.g., "male", "female", "non-binary", "prefer-not-to-say")

COMPUTED FIELDS (Calculate from existing data):
- Age: Calculate from User.dateOfBirth (current date - dateOfBirth)
- Tenure: Calculate from Employee.startDate (current date - startDate) 
- Contract time remaining: contractEndDate - current date
- Years of service: (current date - startDate) / 365

LEAVE & ABSENCE:
- LeaveRequest: id, employeeId, startDate, endDate, approvalStatus, eventCategoryId, dayType, reason
- LeaveEntitlement: id, employeeId, eventCategoryId, totalDays, usedDays, balance
- LeaveApprovalStage: id, leaveRequestId, status, mode, order
- EventCategory: id, name (e.g., "Annual Leave", "Sick Leave", "Bereavement Leave")
- Timesheets: id, employeeId, periodStart, periodEnd, approvalStatus, totalHours, submittedAt, approvedAt
- TimesheetEntry: id, timesheetId, date, startTime, endTime, breakMinutes, hours, notes, entryType

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

Common Query Examples - 50+ Typical HR Questions:

HEADCOUNT & EMPLOYEE DATA:
- "How many employees do we have?" → employee model, count, isActive=true
- "How many in sales?" → employee model, count, filter by department
- "List all employees" → employee model, findMany, isActive=true
- "List people in sales" → employee model, findMany, filter by department (MUST include salaryAmount!)
- "Show me everyone in engineering" → employee model, findMany, department=engineering
- "Who works in marketing?" → employee model, findMany, department=marketing
- "How many active employees?" → employee model, count, isActive=true
- "How many contractors vs permanent staff?" → employee model, group by contractType

SALARY & COMPENSATION:
- "Show names with salaries" → employee model, findMany (returns name + salaryAmount)
- "What's total salary for sales?" → employee model, aggregate, SUM salaryAmount
- "Average salary in IT?" → employee model, aggregate, AVG salaryAmount
- "Total payroll cost?" → employee model, aggregate, SUM salaryAmount (all active)
- "Who earns more than $100k?" → employee model, findMany, salaryAmount > 100000
- "Highest paid employees" → employee model, findMany, orderBy salaryAmount DESC
- "Show salary distribution by department" → employee model, aggregate, group by department
- "What's our monthly payroll?" → employee model, aggregate, SUM salaryAmount / 12

LEAVE & ABSENCE:
- "Who is on leave next week?" → leaveRequest model, findMany, date filter, status APPROVED
- "Who is on leave today?" → leaveRequest model, findMany, date=today, status APPROVED
- "When is the next annual leave?" → leaveRequest model, findMany, date filter upcoming, EventCategory "Annual"
- "How much leave does John have left?" → leaveEntitlement model, findMany, employee=John
- "Who has taken the most leave?" → leaveRequest model, aggregate, count by employeeId
- "Show pending leave requests" → leaveRequest model, findMany, approvalStatus=PENDING
- "Who is sick today?" → leaveRequest model, findMany, date=today, category=Sick

REPORTING STRUCTURE:
- "Who reports into [name]?" → user model, findMany, filter by managerId (direct reports)
- "Who reports to [name]?" → user model, findMany, filter by managerId (direct reports)
- "Show me Sarah's team" → user model, findMany, managerId=Sarah's userId
- "Who is John's manager?" → user model, findFirst, id=John's userId, include manager

TENURE & EXPERIENCE:
- "Who has been here more than 5 years?" → employee model, findMany, WHERE startDate < [date 5 years ago]
- "List employees with less than 1 year tenure" → employee model, findMany, WHERE startDate > [date 1 year ago]
- "Who is in their probation period?" → employee model, findMany, WHERE startDate > [90 days ago]
- "Show new hires from last month" → employee model, findMany, startDate within last month
- "Who started this year?" → employee model, findMany, startDate >= [start of year]
- "Longest serving employees" → employee model, findMany, orderBy startDate ASC

CONTRACT & EMPLOYMENT STATUS:
- "Contracts expiring in next 30 days" → employee model, findMany, WHERE contractEndDate BETWEEN now AND [30 days from now]
- "How many contractors?" → employee model, count, contractType=Contractor
- "List all permanent employees" → employee model, findMany, contractType=Permanent
- "Who is on fixed-term contracts?" → employee model, findMany, contractType=Fixed
- "Show expiring contracts" → employee model, findMany, contractEndDate upcoming

AGE & DEMOGRAPHICS:
- "How many employees are younger than 21?" → employee model, count, WHERE dateOfBirth > [date 21 years ago]
- "Show employees over 30" → employee model, findMany, WHERE dateOfBirth < [date 30 years ago]
- "What is the gender split?" → employee model, group by User.GenderOption.label, count
- "How many male/female employees?" → employee model, count, WHERE User.GenderOption filter
- "Show diversity breakdown" → employee model, findMany, include GenderOption
- "Average age of workforce?" → employee model, aggregate, calculate from dateOfBirth

COMPLIANCE & DOCUMENTS:
- "Who is missing IRD numbers?" → employee model, findMany, irdNumber=null
- "Show employees without tax codes" → employee model, findMany, taxCode=null
- "Who needs to sign documents?" → document model, findMany, requiresSignature=true, unsigned
- "Expiring driver licenses" → driverLicence model, findMany, expiryDate upcoming
- "Driver licenses expiring in next 3 months" → driverLicence model, findMany, expiryDate within 90 days
- "Are any driving licenses expiring soon?" → driverLicence model, count or findMany, expiryDate within period
- "Missing emergency contacts" → employee model, findMany, no emergency contacts

LOCATION & WORK ARRANGEMENTS:
- "Who works remotely?" → employee model, findMany, siteLocation=Remote/WFH
- "How many people in each office?" → employee model, group by siteLocation, count
- "Show Wellington employees" → employee model, findMany, siteLocation=Wellington
- "Who is full-time vs part-time?" → employee model, group by employmentType, count

DEPARTMENTS & TEAMS:
- "How many departments do we have?" → department model, count, active=true
- "List all departments" → department model, findMany
- "What's the biggest department?" → employee model, group by department, count, orderBy DESC
- "Show department heads" → department model, findMany, include head

COMPUTED FIELD EXAMPLES - Age, Tenure, etc:
- "How many employees are younger than 21?" → employee model, count, WHERE dateOfBirth > [date 21 years ago]
- "Show employees over 30" → employee model, findMany, WHERE dateOfBirth < [date 30 years ago]
- "Who has been here more than 5 years?" → employee model, findMany, WHERE startDate < [date 5 years ago]
- "List employees with less than 1 year tenure" → employee model, findMany, WHERE startDate > [date 1 year ago]
- "Contracts expiring in next 30 days" → employee model, findMany, WHERE contractEndDate BETWEEN now AND [30 days from now]
- "Who is in their probation period?" → employee model, findMany, WHERE startDate > [90 days ago] (assuming 90 day probation)

DEMOGRAPHICS & DIVERSITY EXAMPLES:
- "What is the gender split?" → employee model, group by User.GenderOption.label, count
- "How many male/female employees?" → employee model, count, WHERE User.GenderOption filter
- "Show diversity breakdown" → employee model, findMany, include GenderOption
- "Gender distribution by department" → employee model, group by department and gender

CRITICAL EXAMPLES - Study These Patterns:
User: "How many employees?" → {queryType: "count", model: "employee", operation: "isActive = true"}
User: "How many in sales?" → {queryType: "count", model: "employee", operation: "Department filter sales"}
User: "List individuals in sales" → {queryType: "findMany", model: "employee", operation: "Department filter sales"}
User: "Show sales team salaries" → {queryType: "findMany", model: "employee", operation: "Department filter sales"}
User: "Who reports into John?" → {queryType: "findMany", model: "user", operation: "managerId = John's userId"}
User: "Who is on leave today?" → {queryType: "findMany", model: "leaveRequest", operation: "startDate <= today AND endDate >= today AND approvalStatus = APPROVED"}
User: "Total payroll cost?" → {queryType: "aggregate", model: "employee", operation: "SUM salaryAmount WHERE isActive = true"}
User: "Who earns over $100k?" → {queryType: "findMany", model: "employee", operation: "salaryAmount > 100000"}
User: "Contracts expiring soon?" → {queryType: "findMany", model: "employee", operation: "contractEndDate BETWEEN now AND 30 days"}
User: "Who is missing IRD?" → {queryType: "findMany", model: "employee", operation: "irdNumber IS NULL"}
User: "Show new hires" → {queryType: "findMany", model: "employee", operation: "startDate within last 30 days"}
User: "How many contractors?" → {queryType: "count", model: "employee", operation: "contractType = Contractor"}
User: "Who works remotely?" → {queryType: "findMany", model: "employee", operation: "siteLocation contains remote OR work from home"}
User: "Longest serving staff?" → {queryType: "findMany", model: "employee", operation: "ORDER BY startDate ASC"}
User: "Gender split?" → {queryType: "groupBy", model: "employee", operation: "GROUP BY GenderOption.label, COUNT"}
User: "Pending leave requests?" → {queryType: "findMany", model: "leaveRequest", operation: "approvalStatus = PENDING"}

Important Rules:
1. ONLY generate SELECT queries (no UPDATE, DELETE, INSERT)
2. ALWAYS filter by companyId for multi-tenancy (enforced at execution time)
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
15. For "next annual leave" or "upcoming leave" queries, use leaveRequest model with date filters
16. Leave type should be included in operation (e.g., "Annual", "Sick") for category filtering
17. CRITICAL: For "who reports into/to [name]" queries, use USER model (not employee), filter by managerId to find direct reports
18. Reporting structure queries must identify the manager by name first, then find users with managerId = manager's userId
`;

export async function generateQuery(
  prompt: string,
  companyId: string,
  userId: string,
  conversationContext?: string
): Promise<QueryResult> {
  try {
    const directTimesheetResult = await handleDirectTimesheetQuery(
      prompt,
      companyId
    );

    if (directTimesheetResult) {
      return directTimesheetResult;
    }

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
        content: `Previous conversation context:\n${conversationContext}\n\nCRITICAL INSTRUCTIONS FOR FOLLOW-UP QUERIES:
1. If you see "CURRENT DEPARTMENT FILTER: sales" in the context, you MUST include that department filter in your query
2. When user says "them", "their", "those" - they mean the same group from the previous question
3. Example: Previous "How many in sales?" + Current "List them" = List employees WHERE department=sales
4. ALWAYS preserve filters from previous queries unless explicitly told to change them
5. The operation string MUST include the department filter like: Department.name contains "sales"`,
      });
    }

    messages.push({
      role: "user",
      content: `Generate a Prisma query for: "${prompt}"
          
CompanyId to filter by: ${companyId}

CRITICAL DECISION GUIDE:
- "How many" = count
- "List", "Show me", "Who are", "Names of", "Display" = findMany
- "Total salary", "Average salary", "Sum of" = aggregate
- "Gender split", "breakdown by", "distribution by", "group by" = groupBy

Respond with JSON in this format:
{
  "queryType": "count|findMany|aggregate|groupBy",
  "model": "employee|user|leaveRequest|etc",
  "operation": "the prisma code to execute"
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

    // Step 3: Generate chart config if applicable
    const chartConfig = generateChartConfig(
      result.data,
      aiResponse.queryType,
      prompt
    );

    return {
      success: true,
      ...result,
      explanation: aiResponse.explanation || "Query executed successfully",
      query: aiResponse.operation || "",
      chartConfig,
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

  // Security note: companyId filtering is enforced in executeQueryByType
  // The AI-generated operation string is just a guide - actual query construction
  // happens in executeQueryByType which ALWAYS filters by companyId
  
  // Validate that we have a supported model
  const supportedModels = [
    'employee', 'user', 'leaverequest', 'document', 'form', 'formsubmission',
    'formassignment', 'onboardinginstance', 'onboardingtemplate', 'employeeoffboarding',
    'exitinterview', 'employeeperformancereview', 'trainingrecord', 'course',
    'automationrule', 'actionitem', 'automationexecution', 'newspost', 'department',
    'jobrole', 'permissionprofile', 'employeeauditlog', 'emergencycontact', 'location',
    'driverlicence', 'employmentcheck'
  ];
  
  if (!supportedModels.includes(model?.toLowerCase())) {
    throw new Error(`Unsupported model: ${model}. Query rejected for security.`);
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
        
        // Handle age-based queries (younger than X, older than X)
        const ageMatch = operation.match(/(?:younger|older|age|under|over|less than|more than|above|below)\s+(?:than\s+)?(\d+)/i);
        if (ageMatch || operation.includes("dateOfBirth")) {
          const ageLimit = ageMatch ? parseInt(ageMatch[1]) : null;
          const isYounger = operation.match(/younger|under|less than|below/i);
          const isOlder = operation.match(/older|over|more than|above/i);
          
          if (ageLimit) {
            const today = new Date();
            const targetDate = new Date(today.getFullYear() - ageLimit, today.getMonth(), today.getDate());
            
            if (isYounger) {
              // Younger than X = born AFTER (date X years ago)
              where.User = { dateOfBirth: { gt: targetDate } };
            } else if (isOlder) {
              // Older than X = born BEFORE (date X years ago)
              where.User = { dateOfBirth: { lt: targetDate } };
            }
          }
        }
        
        // Handle tenure-based queries
        const tenureMatch = operation.match(/(?:tenure|been here|worked here|employed for).*?(\d+)\s*(?:year|yr)/i);
        if (tenureMatch || (operation.includes("startDate") && operation.includes("year"))) {
          const years = tenureMatch ? parseInt(tenureMatch[1]) : null;
          const isMoreThan = operation.match(/more than|over|greater than|longer than/i);
          const isLessThan = operation.match(/less than|under|fewer than|shorter than/i);
          
          if (years) {
            const today = new Date();
            const targetDate = new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
            
            if (isMoreThan) {
              // More than X years = started BEFORE (date X years ago)
              where.startDate = { lt: targetDate };
            } else if (isLessThan) {
              // Less than X years = started AFTER (date X years ago)
              where.startDate = { gt: targetDate };
            }
          }
        }
        
        // Handle contract expiry queries
        const expiryMatch = operation.match(/expiring.*?(\d+)\s*days?/i);
        if (expiryMatch || operation.includes("contractEndDate")) {
          const days = expiryMatch ? parseInt(expiryMatch[1]) : 30;
          const today = new Date();
          const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
          
          where.contractEndDate = {
            gte: today,
            lte: futureDate,
          };
        }
        
        // Try to extract department from operation OR conversation context
        let departmentName: string | null = null;
        
        // Check for department filter in operation
        if (operation.includes("Department") || operation.includes("department")) {
          const deptMatch = operation.match(/(?:Department|department).*?name.*?["']([^"']+)["']/);
          if (deptMatch) {
            departmentName = deptMatch[1];
          }
        }
        
        // If not found in operation, check conversation context
        if (!departmentName && conversationContext) {
          const contextMatch = conversationContext.match(/(?:departments|teams):\s*([^,\n]+)/i);
          if (contextMatch) {
            departmentName = contextMatch[1].trim();
          }
        }
        
        // Apply department filter if found
        if (departmentName) {
          console.log('[Query Debug - Count] Filtering by department:', departmentName);
          const department = await prisma.department.findFirst({
            where: {
              companyId,
              name: { contains: departmentName, mode: 'insensitive' },
            },
          });
          if (department) {
            console.log('[Query Debug - Count] Found department:', department.name, department.id);
            where.departmentId = department.id;
          } else {
            console.log('[Query Debug - Count] Department not found:', departmentName);
          }
        } else {
          console.log('[Query Debug - Count] No department filter found in operation or context');
          console.log('[Query Debug - Count] Conversation context:', conversationContext);
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
        
        // Handle contract type filtering for counts
        if (operation.includes("contractType") || operation.includes("contractor") || operation.includes("permanent")) {
          const contractMatch = operation.match(/contractType.*?["']([^"']+)["']/i) ||
                               operation.match(/(contractor|permanent|fixed[- ]?term|casual|temporary)/i);
          if (contractMatch) {
            const contractType = contractMatch[1];
            where.contractType = { contains: contractType, mode: 'insensitive' };
          }
        }
        
        // Handle location filtering for counts
        if (operation.includes("siteLocation") || operation.includes("remote") || operation.includes("work from home")) {
          const locationMatch = operation.match(/siteLocation.*?["']([^"']+)["']/i) ||
                               operation.match(/(remote|work from home|wfh|office)/i);
          if (locationMatch) {
            const location = locationMatch[1];
            where.siteLocation = { contains: location, mode: 'insensitive' };
          }
        }
        
        // Default to active employees only if no specific filters
        if (!where.irdNumber && !where.departmentId && !where.jobRoleId && !where.contractType && !where.siteLocation) {
          where.isActive = true;
        }
        
        return await prisma.employee.count({ where });
      }

      if (queryType === "findMany") {
        const where: any = { companyId };
        let orderBy: any = undefined;
        
        // Handle salary threshold queries (earns more than X, less than Y)
        const salaryMatch = operation.match(/salaryAmount\s*([><=]+)\s*(\d+)/i) ||
                           operation.match(/earn[s]?\s*(?:more than|over|above)\s*\$?(\d+[,\d]*)/i) ||
                           operation.match(/earn[s]?\s*(?:less than|under|below)\s*\$?(\d+[,\d]*)/i);
        if (salaryMatch || (operation.includes("salary") && (operation.includes(">") || operation.includes("<")))) {
          const isMoreThan = operation.match(/more than|over|above|greater|>/i);
          const isLessThan = operation.match(/less than|under|below|fewer|</i);
          
          let amount = 0;
          if (salaryMatch) {
            const numStr = salaryMatch[salaryMatch.length - 1].replace(/,/g, '');
            amount = parseInt(numStr);
          }
          
          if (amount > 0) {
            if (isMoreThan) {
              where.salaryAmount = { gt: amount };
            } else if (isLessThan) {
              where.salaryAmount = { lt: amount };
            }
          }
        }
        
        // Handle contract type filtering (contractor, permanent, fixed-term)
        if (operation.includes("contractType") || operation.includes("contractor") || operation.includes("permanent")) {
          const contractMatch = operation.match(/contractType.*?["']([^"']+)["']/i) ||
                               operation.match(/(contractor|permanent|fixed[- ]?term|casual|temporary)/i);
          if (contractMatch) {
            const contractType = contractMatch[1];
            where.contractType = { contains: contractType, mode: 'insensitive' };
          }
        }
        
        // Handle location/remote work filtering
        if (operation.includes("siteLocation") || operation.includes("remote") || operation.includes("work from home") || operation.includes("office")) {
          const locationMatch = operation.match(/siteLocation.*?["']([^"']+)["']/i) ||
                               operation.match(/(remote|work from home|wfh|office|wellington|auckland|christchurch)/i);
          if (locationMatch) {
            const location = locationMatch[1];
            where.siteLocation = { contains: location, mode: 'insensitive' };
          }
        }
        
        // Handle new hires / recent start date filtering
        if (operation.includes("new hire") || operation.includes("recent") || operation.includes("just started")) {
          const daysMatch = operation.match(/(?:last|past)\s*(\d+)\s*days?/i) ||
                           operation.match(/(?:within|in)\s*(\d+)\s*days?/i);
          const days = daysMatch ? parseInt(daysMatch[1]) : 30; // Default to 30 days
          
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          where.startDate = { gte: cutoffDate };
        }
        
        // Handle "longest serving" / "shortest tenure" ordering
        if (operation.includes("longest serving") || operation.includes("ORDER BY startDate ASC")) {
          orderBy = { startDate: 'asc' };
        } else if (operation.includes("newest") || operation.includes("most recent") || operation.includes("ORDER BY startDate DESC")) {
          orderBy = { startDate: 'desc' };
        } else if (operation.includes("highest paid") || operation.includes("ORDER BY salaryAmount DESC")) {
          orderBy = { salaryAmount: 'desc' };
        } else if (operation.includes("lowest paid") || operation.includes("ORDER BY salaryAmount ASC")) {
          orderBy = { salaryAmount: 'asc' };
        }
        
        // Handle age-based queries
        const ageMatch = operation.match(/(?:younger|older|age|under|over|less than|more than|above|below)\s+(?:than\s+)?(\d+)/i);
        if (ageMatch || operation.includes("dateOfBirth")) {
          const ageLimit = ageMatch ? parseInt(ageMatch[1]) : null;
          const isYounger = operation.match(/younger|under|less than|below/i);
          const isOlder = operation.match(/older|over|more than|above/i);
          
          if (ageLimit) {
            const today = new Date();
            const targetDate = new Date(today.getFullYear() - ageLimit, today.getMonth(), today.getDate());
            
            if (isYounger) {
              where.User = { dateOfBirth: { gt: targetDate } };
            } else if (isOlder) {
              where.User = { dateOfBirth: { lt: targetDate } };
            }
          }
        }
        
        // Handle tenure-based queries
        const tenureMatch = operation.match(/(?:tenure|been here|worked here|employed for).*?(\d+)\s*(?:year|yr)/i);
        if (tenureMatch || (operation.includes("startDate") && operation.includes("year"))) {
          const years = tenureMatch ? parseInt(tenureMatch[1]) : null;
          const isMoreThan = operation.match(/more than|over|greater than|longer than/i);
          const isLessThan = operation.match(/less than|under|fewer than|shorter than/i);
          
          if (years) {
            const today = new Date();
            const targetDate = new Date(today.getFullYear() - years, today.getMonth(), today.getDate());
            
            if (isMoreThan) {
              where.startDate = { lt: targetDate };
            } else if (isLessThan) {
              where.startDate = { gt: targetDate };
            }
          }
        }
        
        // Handle contract expiry
        const expiryMatch = operation.match(/expiring.*?(\d+)\s*days?/i);
        if (expiryMatch || operation.includes("contractEndDate")) {
          const days = expiryMatch ? parseInt(expiryMatch[1]) : 30;
          const today = new Date();
          const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
          
          where.contractEndDate = {
            gte: today,
            lte: futureDate,
          };
        }
        
        // Check if looking up specific person by name (for email, phone, etc.)
        const nameMatch = operation.match(/(?:firstName|lastName|name).*?["']([^"']+)["']/i);
        if (nameMatch && !where.User) { // Don't override age filter
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
            contractEndDate: true,
            isActive: true,
            siteLocation: true,
            User: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                dateOfBirth: true,
                GenderOption: {
                  select: {
                    label: true,
                    key: true,
                  },
                },
              },
            },
            Department: {
              select: { name: true },
            },
            JobRole: {
              select: { name: true },
            },
          },
          ...(orderBy && { orderBy }),
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

      if (queryType === "groupBy") {
        // Handle gender split queries
        if (operation.includes("gender") || operation.includes("GenderOption")) {
          const employees = await prisma.employee.findMany({
            where: {
              companyId,
              isActive: true,
            },
            include: {
              User: {
                include: {
                  GenderOption: true,
                },
              },
              Department: true,
            },
          });

          // Group by gender
          const genderGroups = employees.reduce((acc: any, emp: any) => {
            const genderLabel = emp.User?.GenderOption?.label || "Not specified";
            if (!acc[genderLabel]) {
              acc[genderLabel] = { count: 0, employees: [] };
            }
            acc[genderLabel].count++;
            acc[genderLabel].employees.push({
              name: `${emp.User?.firstName || ''} ${emp.User?.lastName || ''}`.trim(),
              department: emp.Department?.name || 'N/A',
            });
            return acc;
          }, {});

          // Convert to array format for easier display
          const result = Object.entries(genderGroups).map(([gender, data]: [string, any]) => ({
            gender,
            count: data.count,
            percentage: ((data.count / employees.length) * 100).toFixed(1),
          }));

          return result;
        }

        // Handle department grouping
        if (operation.includes("department") || operation.includes("Department")) {
          return await prisma.employee.groupBy({
            by: ["departmentId"],
            where: { companyId, isActive: true },
            _count: { id: true },
          });
        }
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
        
        // Handle date filtering for "next", "upcoming", "this week", etc.
        const hasDateFilter = operation.includes("next") || 
                            operation.includes("upcoming") || 
                            operation.includes("startDate") ||
                            operation.includes("future");
        
        if (hasDateFilter) {
          const now = new Date();
          const futureDate = new Date();
          
          // Determine the time range based on the query
          if (operation.includes("next week") || operation.includes("this week")) {
            futureDate.setDate(now.getDate() + 7);
          } else if (operation.includes("next month")) {
            futureDate.setMonth(now.getMonth() + 1);
          } else {
            // Default: next 90 days for "upcoming" or "next"
            futureDate.setDate(now.getDate() + 90);
          }
          
          where.OR = [
            // Starts within the range
            {
              startDate: {
                gte: now,
                lte: futureDate,
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
        
        // Handle leave type/category filtering (e.g., "annual leave", "sick leave")
        const categoryMatch = operation.match(/(?:Annual|Sick|Bereavement|Parental|Study|Unpaid)/i);
        if (categoryMatch) {
          const categoryName = categoryMatch[0];
          const category = await prisma.eventCategory.findFirst({
            where: {
              companyId,
              name: { contains: categoryName, mode: 'insensitive' },
            },
          });
          if (category) {
            where.eventCategoryId = category.id;
          }
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

    // DRIVER LICENSES & EMPLOYMENT CHECKS
    case "driverlicence":
      if (queryType === "count") {
        const where: any = {
          Employee: { companyId },
        };
        
        // Handle expiring licenses queries
        if (operation.includes("expir")) {
          const daysMatch = operation.match(/(\d+)\s*(?:days?|months?)/i);
          const days = daysMatch ? parseInt(daysMatch[1]) : 30;
          const monthMatch = operation.includes("month");
          const multiplier = monthMatch ? 30 : 1;
          
          const today = new Date();
          const futureDate = new Date(today.getTime() + (days * multiplier * 24 * 60 * 60 * 1000));
          
          where.expiryDate = {
            gte: today,
            lte: futureDate,
          };
        }
        
        return await prisma.driverLicence.count({ where });
      }
      
      if (queryType === "findMany") {
        const where: any = {
          Employee: { companyId },
        };
        
        // Handle expiring licenses
        if (operation.includes("expir")) {
          const daysMatch = operation.match(/(\d+)\s*(?:days?|months?)/i);
          const days = daysMatch ? parseInt(daysMatch[1]) : 90; // Default to 3 months
          const monthMatch = operation.includes("month");
          const multiplier = monthMatch ? 30 : 1;
          
          const today = new Date();
          const futureDate = new Date(today.getTime() + (days * multiplier * 24 * 60 * 60 * 1000));
          
          where.expiryDate = {
            gte: today,
            lte: futureDate,
          };
        }
        
        return await prisma.driverLicence.findMany({
          where,
          include: {
            Employee: {
              include: {
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
              },
            },
          },
          orderBy: { expiryDate: 'asc' },
          take: 100,
        });
      }
      break;

    case "employmentcheck":
      if (queryType === "count") {
        const where: any = {
          Employee: { companyId },
        };
        
        if (operation.includes("expir")) {
          const daysMatch = operation.match(/(\d+)\s*(?:days?|months?)/i);
          const days = daysMatch ? parseInt(daysMatch[1]) : 30;
          const monthMatch = operation.includes("month");
          const multiplier = monthMatch ? 30 : 1;
          
          const today = new Date();
          const futureDate = new Date(today.getTime() + (days * multiplier * 24 * 60 * 60 * 1000));
          
          where.expiryDate = {
            gte: today,
            lte: futureDate,
          };
        }
        
        return await prisma.employmentCheck.count({ where });
      }
      
      if (queryType === "findMany") {
        const where: any = {
          Employee: { companyId },
        };
        
        if (operation.includes("expir")) {
          const daysMatch = operation.match(/(\d+)\s*(?:days?|months?)/i);
          const days = daysMatch ? parseInt(daysMatch[1]) : 90;
          const monthMatch = operation.includes("month");
          const multiplier = monthMatch ? 30 : 1;
          
          const today = new Date();
          const futureDate = new Date(today.getTime() + (days * multiplier * 24 * 60 * 60 * 1000));
          
          where.expiryDate = {
            gte: today,
            lte: futureDate,
          };
        }
        
        return await prisma.employmentCheck.findMany({
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
          },
          orderBy: { expiryDate: 'asc' },
          take: 100,
        });
      }
      break;

    // USER - for reporting structure queries
    case "user":
      if (queryType === "findMany") {
        // Handle "who reports to X" queries
        const managerMatch = operation.match(/managerId.*?["']([^"']+)["']/i) ||
                           operation.match(/manager.*?name.*?["']([^"']+)["']/i) ||
                           operation.match(/reports to.*?["']([^"']+)["']/i);
        
        if (managerMatch) {
          const managerName = managerMatch[1];
          
          // First, find the manager by name
          const manager = await prisma.user.findFirst({
            where: {
              companyId,
              OR: [
                { firstName: { contains: managerName, mode: 'insensitive' } },
                { lastName: { contains: managerName, mode: 'insensitive' } },
                {
                  AND: [
                    { firstName: { contains: managerName.split(' ')[0], mode: 'insensitive' } },
                    { lastName: { contains: managerName.split(' ')[1] || managerName.split(' ')[0], mode: 'insensitive' } },
                  ],
                },
              ],
            },
          });
          
          if (!manager) {
            return {
              error: `Manager "${managerName}" not found`,
              directReports: [],
              indirectReports: [],
            };
          }
          
          // Find direct reports
          const directReports = await prisma.user.findMany({
            where: {
              companyId,
              managerId: manager.id,
            },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              Employee: {
                select: {
                  salaryAmount: true,
                  Department: {
                    select: { name: true },
                  },
                  JobRole: {
                    select: { name: true },
                  },
                },
              },
            },
            orderBy: [
              { lastName: 'asc' },
              { firstName: 'asc' },
            ],
          });
          
          // Find indirect reports (reports of direct reports)
          const indirectReports = [];
          for (const directReport of directReports) {
            const reports = await prisma.user.findMany({
              where: {
                companyId,
                managerId: directReport.id,
              },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
                Employee: {
                  select: {
                    salaryAmount: true,
                    Department: {
                      select: { name: true },
                    },
                    JobRole: {
                      select: { name: true },
                    },
                  },
                },
              },
            });
            indirectReports.push(...reports);
          }
          
          return {
            manager: {
              id: manager.id,
              name: `${manager.firstName} ${manager.lastName}`,
            },
            directReports,
            indirectReports,
            totalDirectReports: directReports.length,
            totalIndirectReports: indirectReports.length,
            totalReports: directReports.length + indirectReports.length,
          };
        }
      }
      break;

    default:
      throw new Error(`Unsupported model: ${model}`);
  }

  throw new Error("Query pattern not recognized");
}

async function handleDirectTimesheetQuery(
  prompt: string,
  companyId: string
): Promise<QueryResult | null> {
  const normalizedPrompt = prompt.toLowerCase();
  const status = deriveTimesheetStatus(prompt);
  const intent = detectTimesheetIntent(normalizedPrompt, status);

  if (!intent) {
    return null;
  }

  const dateFilter = deriveTimesheetDateRange(prompt, status);

  if (intent.kind === "hours" || intent.kind === "entries") {
    const employeeResolution = await resolveTimesheetEmployee(prompt, companyId);

    if (!employeeResolution) {
      return null;
    }

    if (employeeResolution.kind === "not_found") {
      const message = employeeResolution.requestedName
        ? `I couldn't find anyone named "${employeeResolution.requestedName}". Please check the spelling or provide more detail.`
        : "I couldn't determine which employee you meant. Could you provide their name?";

      return {
        success: false,
        explanation: message,
        query: "direct-timesheet-employee",
        error: message,
        meta: {
          timesheet: {
            kind: "clarification",
            reason: "employee_not_found",
          },
        },
      };
    }

    if (employeeResolution.kind === "ambiguous") {
      const options = employeeResolution.matches
        .map((match) => `• ${match.name}${match.email ? ` (${match.email})` : ""}`)
        .join("\n");
      const message = `I found multiple employees matching "${employeeResolution.requestedName}":\n\n${options}\n\nCould you clarify who you meant?`;

      return {
        success: false,
        explanation: message,
        query: "direct-timesheet-employee",
        error: message,
        meta: {
          timesheet: {
            kind: "clarification",
            reason: "employee_ambiguous",
            options: employeeResolution.matches,
          },
        },
      };
    }

    const { employeeId, employeeName } = employeeResolution;

    if (intent.kind === "hours") {
      const hoursResult = await prisma.timesheetEntry.aggregate({
        _sum: { hours: true },
        where: {
          Timesheet: {
            companyId,
            employeeId,
            ...(status ? { approvalStatus: status } : {}),
          },
          ...(dateFilter?.start && dateFilter?.end
            ? {
                date: {
                  gte: dateFilter.start,
                  lte: dateFilter.end,
                },
              }
            : {}),
        },
      });

      const totalHours = Number(hoursResult._sum?.hours ?? 0);
      const periodLabel = dateFilter?.label ? ` ${dateFilter.label}` : "";
      const statusText = status ? ` (${formatTimesheetStatus(status)})` : "";
      const explanation = `${employeeName} logged ${formatHours(totalHours)} hours${periodLabel}${statusText}.`;

      return {
        success: true,
        data: totalHours,
        explanation,
        query: "direct-timesheet-hours",
        meta: {
          timesheet: {
            kind: "hours",
            employeeId,
            employeeName,
            totalHours,
            formattedHours: formatHours(totalHours),
            dateLabel: dateFilter?.label ?? null,
            dateRange:
              dateFilter?.start && dateFilter?.end
                ? {
                    start: dateFilter.start.toISOString(),
                    end: dateFilter.end.toISOString(),
                  }
                : null,
            status: status ?? null,
            statusLabel: status ? formatTimesheetStatus(status) : null,
          },
        },
      };
    }

    const entryWhere: Prisma.TimesheetEntryWhereInput = {
      Timesheet: {
        companyId,
        employeeId,
        ...(status ? { approvalStatus: status } : {}),
      },
      ...(dateFilter?.start && dateFilter?.end
        ? {
            date: {
              gte: dateFilter.start,
              lte: dateFilter.end,
            },
          }
        : {}),
    };

    const entryRecords = await prisma.timesheetEntry.findMany({
      where: entryWhere,
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
      select: {
        id: true,
        date: true,
        startTime: true,
        endTime: true,
        breakMinutes: true,
        hours: true,
        notes: true,
        entryType: true,
      },
    });

    const entries = entryRecords.map((entry) => ({
      id: entry.id,
      date: entry.date?.toISOString() ?? null,
      startTime: entry.startTime?.toISOString() ?? null,
      endTime: entry.endTime?.toISOString() ?? null,
      breakMinutes: entry.breakMinutes ?? 0,
      hours: Number(entry.hours ?? 0),
      notes: entry.notes ?? null,
      entryType: entry.entryType ?? null,
    }));

    const totalHours = entries.reduce((sum, entry) => sum + entry.hours, 0);
    const periodLabel = dateFilter?.label ? ` ${dateFilter.label}` : "";
    const explanation = entries.length
      ? `Found ${entries.length} time ${entries.length === 1 ? "entry" : "entries"} for ${employeeName}${periodLabel}.`
      : `I couldn't find any time entries for ${employeeName}${periodLabel}.`;

    return {
      success: true,
      data: entries,
      explanation,
      query: "direct-timesheet-entries",
      meta: {
        timesheet: {
          kind: "entries",
          employeeId,
          employeeName,
          totalEntries: entries.length,
          totalHours: Number(totalHours.toFixed(2)),
          dateLabel: dateFilter?.label ?? null,
          dateRange:
            dateFilter?.start && dateFilter?.end
              ? {
                  start: dateFilter.start.toISOString(),
                  end: dateFilter.end.toISOString(),
                }
              : null,
          status: status ?? null,
          statusLabel: status ? formatTimesheetStatus(status) : null,
          entries,
        },
      },
    };
  }

  const where: any = { companyId };

  if (status) {
    where.approvalStatus = status;
  }

  if (dateFilter && dateFilter.start && dateFilter.end) {
    where[dateFilter.field] = {
      gte: dateFilter.start,
      lte: dateFilter.end,
    };

    if (dateFilter.field === "approvedAt" && !where.approvalStatus) {
      where.approvalStatus = "APPROVED";
    }
  }

  if (!where.approvalStatus && normalizedPrompt.includes("approved")) {
    where.approvalStatus = "APPROVED";
  }

  const count = await prisma.timesheet.count({ where });

  const statusLabel = where.approvalStatus
    ? formatTimesheetStatus(where.approvalStatus)
    : "timesheets";
  const periodLabel = dateFilter?.label ? ` ${dateFilter.label}` : "";

  return {
    success: true,
    data: count,
    count,
    explanation: `Found ${count} ${statusLabel}${periodLabel}.`,
    query: "direct-timesheet-query",
    meta: {
      timesheet: {
        kind: "count",
        approvalStatus: where.approvalStatus ?? null,
        statusLabel,
        dateField: dateFilter?.field ?? null,
        dateLabel: dateFilter?.label ?? null,
        count,
      },
    },
  };
}

export function deriveTimesheetStatus(prompt: string): ApprovalStatus | undefined {
  const normalized = prompt.toLowerCase();

  if (normalized.includes("approved")) return "APPROVED";
  if (normalized.includes("pending") || normalized.includes("awaiting")) return "PENDING";
  if (normalized.includes("declined") || normalized.includes("rejected")) return "DECLINED";
  if (normalized.includes("cancelled") || normalized.includes("canceled")) return "CANCELLED";
  return undefined;
}

export function deriveTimesheetDateRange(
  prompt: string,
  status: ApprovalStatus | undefined
): {
  field: "approvedAt" | "submittedAt" | "periodStart";
  start?: Date;
  end?: Date;
  label?: string;
} | null {
  const normalized = prompt.toLowerCase();
  const field = status === "APPROVED"
    ? "approvedAt"
    : status === "PENDING"
    ? "submittedAt"
    : "periodStart";

  const now = new Date();

  if (normalized.includes("this week")) {
    const { start, end } = getWeekRange(now, 0);
    return { field, start, end, label: "this week" };
  }

  if (normalized.includes("last week") || normalized.includes("previous week")) {
    const { start, end } = getWeekRange(now, 1);
    return { field, start, end, label: "last week" };
  }

  if (normalized.includes("this month")) {
    const { start, end } = getMonthRange(now, 0);
    return { field, start, end, label: "this month" };
  }

  if (normalized.includes("last month") || normalized.includes("previous month")) {
    const { start, end } = getMonthRange(now, 1);
    return { field, start, end, label: "last month" };
  }

  if (normalized.includes("today")) {
    const { start, end } = getDayRange(now, 0);
    return { field, start, end, label: "today" };
  }

  if (normalized.includes("yesterday")) {
    const { start, end } = getDayRange(now, 1);
    return { field, start, end, label: "yesterday" };
  }

  return null;
}

function getWeekRange(reference: Date, weeksAgo: number) {
  const start = new Date(reference);
  const day = start.getDay();
  const diff = (day + 6) % 7; // Monday as start of week
  start.setDate(start.getDate() - diff - weeksAgo * 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatTimesheetStatus(status: string): string {
  switch (status) {
    case "APPROVED":
      return "approved timesheets";
    case "PENDING":
      return "pending timesheets";
    case "DECLINED":
      return "declined timesheets";
    case "CHANGES_REQUESTED":
      return "timesheets with changes requested";
    default:
      return "timesheets";
  }
}

function getMonthRange(reference: Date, monthsAgo: number) {
  const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
  start.setMonth(start.getMonth() - monthsAgo);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function getDayRange(reference: Date, daysAgo: number) {
  const start = new Date(reference);
  start.setDate(start.getDate() - daysAgo);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function detectTimesheetIntent(
  prompt: string,
  status?: string | undefined
): { kind: "count" | "hours" | "entries" } | null {
  const mentionsTimesheet = prompt.includes("timesheet");
  const mentionsHours = /\b(hours?|hrs?)\b/.test(prompt);
  const mentionsWork = /\bwork(?:ed|ing)?\b/.test(prompt) || prompt.includes("logged");
  const wantsCount = /\b(count|how many|number of|has there|have there|are there|any)\b/.test(
    prompt
  );
  const mentionsEntries =
    prompt.includes("time entries") ||
    /\bentries?\b/.test(prompt) ||
    /\btime\s+entry\b/.test(prompt);
  const wantsBreakdown =
    /\bbreakdown\b/.test(prompt) ||
    /\bdetail(?:ed|s)?\b/.test(prompt) ||
    /\bshow\b/.test(prompt) ||
    /\blist\b/.test(prompt);

  if (mentionsEntries || (mentionsTimesheet && wantsBreakdown && mentionsHours)) {
    return { kind: "entries" };
  }

  if (mentionsHours && (mentionsWork || mentionsTimesheet)) {
    return { kind: "hours" };
  }

  if ((mentionsTimesheet || status) && wantsCount) {
    return { kind: "count" };
  }

  if (mentionsTimesheet && wantsCount) {
    return { kind: "count" };
  }

  return null;
}

type TimesheetEmployeeResolution =
  | {
      kind: "resolved";
      employeeId: string;
      employeeName: string;
    }
  | {
      kind: "not_found";
      requestedName?: string;
    }
  | {
      kind: "ambiguous";
      requestedName: string;
      matches: Array<{ id: string; name: string; email: string }>;
    };

async function resolveTimesheetEmployee(
  prompt: string,
  companyId: string
): Promise<TimesheetEmployeeResolution | null> {
  const candidates = extractTimesheetNameCandidates(prompt);

  if (candidates.length === 0) {
    return null;
  }

  const ambiguousMatches: Array<{ id: string; name: string; email: string }> = [];
  let ambiguousRequestedName: string | undefined;

  for (const candidate of candidates.slice(0, 4)) {
    const matches = await findEmployeeByName(candidate, companyId);

    if (matches.length > 0) {
      const normalizedCandidate = normalizeName(candidate);
      const exactMatches = matches.filter(
        (match) => normalizeName(match.name) === normalizedCandidate
      );

      if (exactMatches.length === 1) {
        return {
          kind: "resolved",
          employeeId: exactMatches[0].id,
          employeeName: exactMatches[0].name,
        };
      }

      if (exactMatches.length > 1) {
        return {
          kind: "ambiguous",
          requestedName: toTitleCase(candidate),
          matches: exactMatches.map((m) => ({ id: m.id, name: m.name, email: m.email })),
        };
      }

      const candidateParts = normalizedCandidate.split(" ").filter(Boolean);

      if (candidateParts.length > 0) {
        const scoredMatches = matches.map((match) => {
          const normalizedName = normalizeName(match.name);
          const nameParts = normalizedName.split(" ").filter(Boolean);
          let score = 0;

          if (normalizedName === normalizedCandidate) {
            score += 10;
          }

          const sharedParts = candidateParts.filter((part) => nameParts.includes(part));
          score += sharedParts.length;

          return { match, score };
        });

        scoredMatches.sort((a, b) => b.score - a.score);

        if (scoredMatches[0] && scoredMatches[0].score > 0) {
          const topScore = scoredMatches[0].score;
          const secondScore = scoredMatches[1]?.score ?? -1;

          if (topScore > secondScore) {
            return {
              kind: "resolved",
              employeeId: scoredMatches[0].match.id,
              employeeName: scoredMatches[0].match.name,
            };
          }
        }
      }
    }

    if (matches.length === 1) {
      return {
        kind: "resolved",
        employeeId: matches[0].id,
        employeeName: matches[0].name,
      };
    }

    if (matches.length > 1 && ambiguousMatches.length === 0) {
      ambiguousRequestedName = toTitleCase(candidate);
      ambiguousMatches.push(...matches.map((m) => ({ id: m.id, name: m.name, email: m.email })));
    }
  }

  if (ambiguousMatches.length > 0 && ambiguousRequestedName) {
    return {
      kind: "ambiguous",
      requestedName: ambiguousRequestedName,
      matches: ambiguousMatches,
    };
  }

  return {
    kind: "not_found",
    requestedName: toTitleCase(candidates[0]),
  };
}

function extractTimesheetNameCandidates(prompt: string): string[] {
  const lowered = prompt.toLowerCase();
  const candidates = new Set<string>();

  const patterns: RegExp[] = [
    /hours?\s+(?:did|does|has|have)\s+([a-z][\w\s'-]{1,60}?)\s+(?:work|log|logged|clock|clocked|submit|submitted)/i,
    /(?:did|does|has|have)\s+([a-z][\w\s'-]{1,60}?)\s+(?:work|log|logged|clock|clocked|submit|submitted)/i,
    /for\s+([a-z][\w\s'-]{1,60}?)\s+(?:hours?|timesheet|timesheets|work)/i,
    /about\s+([a-z][\w\s'-]{1,60}?)\s+(?:hours?|timesheet|timesheets|work)/i,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(prompt);
    if (match?.[1]) {
      const cleaned = cleanNameCandidate(match[1]);
      if (cleaned) {
        candidates.add(cleaned);
      }
    }
  }

  if (candidates.size === 0) {
    const tokens = lowered
      .replace(/[^a-z\s'-]/gi, " ")
      .split(/\s+/)
      .filter(Boolean);

    for (let i = 0; i < tokens.length - 1; i++) {
      const pair = cleanNameCandidate(`${tokens[i]} ${tokens[i + 1]}`);
      if (pair && pair.split(" ").length === 2) {
        candidates.add(pair);
      }
    }
  }

  return Array.from(candidates).map((name) => name.trim()).filter(Boolean);
}

function cleanNameCandidate(raw: string): string {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "this",
    "that",
    "last",
    "next",
    "week",
    "month",
    "period",
    "today",
    "yesterday",
    "hours",
    "hour",
    "timesheet",
    "timesheets",
    "work",
    "worked",
    "working",
    "logged",
    "log",
    "clock",
    "clocked",
    "for",
    "did",
    "does",
    "has",
    "have",
    "any",
    "many",
    "how",
  ]);

  const parts = raw
    .replace(/[^a-z\s'-]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);

  while (parts.length > 0 && stopWords.has(parts[0].toLowerCase())) {
    parts.shift();
  }

  while (parts.length > 0 && stopWords.has(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }

  if (parts.length === 0) {
    return "";
  }

  if (parts.length === 1 && parts[0].length < 2) {
    return "";
  }

  return parts.join(" ");
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function normalizeName(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function formatHours(value: number): string {
  if (!value) {
    return "0";
  }

  // Use up to 2 decimal places, trimming trailing zeros
  return Number(value.toFixed(2)).toString();
}

// Generate chart configuration for visualizable data
function generateChartConfig(
  data: any,
  queryType: string,
  prompt: string
): ChartConfig | undefined {
  // Only generate charts if user explicitly asks for visualization
  const lowerPrompt = prompt.toLowerCase();
  const chartKeywords = [
    'chart', 'graph', 'visualize', 'visualise', 'plot', 
    'show me a chart', 'show me a graph', 'create a chart',
    'make a chart', 'generate a chart', 'draw a chart'
  ];
  
  const wantsChart = chartKeywords.some(keyword => lowerPrompt.includes(keyword));
  
  if (!wantsChart) {
    return undefined; // User didn't ask for a chart
  }
  
  // Only generate charts for groupBy or aggregate results with multiple data points
  if (!data || typeof data !== "object") return undefined;

  // Handle groupBy results (like gender split, department breakdown)
  if (Array.isArray(data) && data.length > 0 && data.length <= 20) {
    const firstItem = data[0];
    
    // Gender split / demographic data
    if (firstItem.gender !== undefined || firstItem.count !== undefined) {
      // Check if it looks like grouped data with counts
      const hasCountField = data.every((item: any) => 
        typeof item.count === "number" || typeof item.value === "number"
      );
      
      if (hasCountField) {
        const labelKey = firstItem.gender ? "gender" : 
                        firstItem.department ? "department" :
                        firstItem.name ? "name" : "label";
        const valueKey = firstItem.count !== undefined ? "count" : "value";
        
        // Determine chart type based on query
        let chartType: "bar" | "pie" | "line" = "bar";
        
        // Allow user to specify chart type
        if (lowerPrompt.includes("pie chart") || lowerPrompt.includes("pie graph")) {
          chartType = "pie";
        } else if (lowerPrompt.includes("line chart") || lowerPrompt.includes("line graph") || 
                   lowerPrompt.includes("trend") || lowerPrompt.includes("over time")) {
          chartType = "line";
        } else if (lowerPrompt.includes("bar chart") || lowerPrompt.includes("bar graph")) {
          chartType = "bar";
        } else {
          // Default logic based on data
          if (lowerPrompt.includes("split") || lowerPrompt.includes("distribution") || 
              lowerPrompt.includes("breakdown") || data.length <= 6) {
            chartType = "pie";
          }
        }
        
        // Format data for charts
        const chartData = data.map((item: any) => ({
          name: item[labelKey] || "Unknown",
          value: item[valueKey] || 0,
          count: item[valueKey] || 0,
          percentage: item.percentage,
        }));
        
        return {
          type: chartType,
          data: chartData,
          title: extractChartTitle(prompt),
          description: `Visual breakdown of ${data.length} categories`,
          labelKey: "name",
          valueKey: "value",
          xKey: "name",
          yKey: "value",
        };
      }
    }
  }
  
  // Handle aggregate results (salary totals, etc.)
  if (queryType === "aggregate" && !Array.isArray(data)) {
    const metrics = Object.entries(data)
      .filter(([key, value]) => typeof value === "number" && value > 0)
      .map(([key, value]) => ({
        name: humanizeKey(key),
        value: value as number,
      }));
    
    if (metrics.length >= 2) {
      return {
        type: "bar",
        data: metrics,
        title: extractChartTitle(prompt),
        description: "Key metrics visualization",
        labelKey: "name",
        valueKey: "value",
        xKey: "name",
        yKey: "value",
      };
    }
  }
  
  return undefined;
}

function extractChartTitle(prompt: string): string {
  // Extract meaningful title from the prompt
  const cleaned = prompt
    .replace(/^(what|show|tell|how|list|give)/i, "")
    .replace(/\?$/g, "")
    .trim();
  
  if (cleaned.length > 0) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  return "Data Visualization";
}

function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

