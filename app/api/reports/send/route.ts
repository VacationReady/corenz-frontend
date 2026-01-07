import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { exportTableToPdf } from "@/lib/pdfExport";
import { buildDynamicQuery, attachComputedFields } from "@/lib/queryBuilder";
import Papa from "papaparse";
import { resolveReportingTimeConfig } from "@/lib/reportingTimeConfig";
import { isEmailRateLimited, getEmailRateLimitError } from "@/lib/email-rate-limit";

export const runtime = "nodejs";

interface SendReportRequest {
  reportId: number;
  reportName: string;
  departments: string[]; // Array of department IDs
  jobRoles: string[]; // Array of job role IDs
  employees: string[]; // Array of individual employee/user IDs
  format: "PDF" | "EXCEL";
  subject: string;
  messageBody?: string;
  fields: string[];
  filters?: any[];
  filterGroup?: any;
  sort?: any;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check email rate limit before processing
    const rateLimited = await isEmailRateLimited(session.user.id);
    if (rateLimited) {
      return NextResponse.json(getEmailRateLimitError(), { status: 429 });
    }

    const body: SendReportRequest = await req.json();
    const {
      reportId,
      reportName,
      departments,
      jobRoles,
      employees,
      format,
      subject,
      messageBody,
      fields,
      filters,
      filterGroup,
      sort,
    } = body;

    // Validate required fields
    if (!reportId || !reportName || !format || !subject || !fields) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (
      (!departments || departments.length === 0) &&
      (!jobRoles || jobRoles.length === 0) &&
      (!employees || employees.length === 0)
    ) {
      return NextResponse.json(
        { error: "Please select at least one department, job role, or individual employee" },
        { status: 400 }
      );
    }

    // Fetch recipients based on department/job role/individual employee filters
    const recipients = await getRecipients(
      session.user.companyId,
      departments,
      jobRoles,
      employees
    );

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients found matching the selected filters" },
        { status: 400 }
      );
    }

    const timeConfig = await resolveReportingTimeConfig(
      session.user.id,
      session.user.companyId,
    );

    // Fetch report data
    const reportData = await fetchReportData(
      session.user.companyId,
      fields,
      filters,
      filterGroup,
      sort,
      timeConfig.timeZone,
    );

    if (!reportData || reportData.length === 0) {
      return NextResponse.json(
        { error: "No data available for this report" },
        { status: 400 }
      );
    }

    // Generate attachment (PDF or Excel)
    const attachment = await generateAttachment(
      reportName,
      reportData,
      fields,
      format
    );

    // Get department and job role details for logging
    const departmentDetails = await getDepartmentDetails(
      session.user.companyId,
      departments
    );
    const jobRoleDetails = await getJobRoleDetails(
      session.user.companyId,
      jobRoles
    );

    // Send emails via Resend
    const emailResults = await sendReportEmails(
      recipients,
      subject,
      messageBody || "",
      reportName,
      attachment,
      format
    );

    // Determine recipient type
    const recipientType =
      departments.length > 0 && jobRoles.length > 0
        ? "MIXED"
        : departments.length > 0
        ? "DEPARTMENT"
        : "JOB_ROLE";

    // Log to audit trail
    const sendHistory = await prisma.reportSendHistory.create({
      data: {
        reportId,
        reportName,
        sentBy: session.user.id,
        companyId: session.user.companyId,
        recipientType,
        departments: departmentDetails,
        jobRoles: jobRoleDetails,
        recipientCount: recipients.length,
        recipientEmails: recipients.map((r) => r.email),
        format,
        subject,
        messageBody,
      },
    });

    return NextResponse.json({
      success: true,
      recipientCount: recipients.length,
      historyId: sendHistory.id,
      message: `Report sent successfully to ${recipients.length} recipient(s)`,
    });
  } catch (error) {
    console.error("Error sending report:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send report",
      },
      { status: 500 }
    );
  }
}

async function getRecipients(
  companyId: string,
  departments: string[],
  jobRoles: string[],
  employeeIds: string[]
) {
  // 🔒 Bug Fix 3.2: Validate employee IDs belong to company BEFORE building query
  // This prevents potential cross-tenant data exposure if IDs are guessed/leaked
  if (employeeIds && employeeIds.length > 0) {
    const validEmployees = await prisma.user.findMany({
      where: {
        id: { in: employeeIds },
        companyId, // Explicit tenant check
        isActivated: true,
      },
      select: { id: true },
    });
    
    const validIds = new Set(validEmployees.map(e => e.id));
    const invalidIds = employeeIds.filter(id => !validIds.has(id));
    
    if (invalidIds.length > 0) {
      console.warn(`[reports/send] Invalid employee IDs filtered out: ${invalidIds.join(', ')}`);
      // Filter to only valid IDs instead of throwing - more graceful handling
      employeeIds = employeeIds.filter(id => validIds.has(id));
    }
  }

  // Similarly validate departments and job roles belong to company
  if (departments && departments.length > 0) {
    const validDepts = await prisma.department.findMany({
      where: { id: { in: departments }, companyId },
      select: { id: true },
    });
    const validDeptIds = new Set(validDepts.map(d => d.id));
    departments = departments.filter(id => validDeptIds.has(id));
  }

  if (jobRoles && jobRoles.length > 0) {
    const validRoles = await prisma.jobRole.findMany({
      where: { id: { in: jobRoles }, companyId },
      select: { id: true },
    });
    const validRoleIds = new Set(validRoles.map(r => r.id));
    jobRoles = jobRoles.filter(id => validRoleIds.has(id));
  }

  const whereConditions: any = {
    companyId,
    isActivated: true,
  };

  // Build OR conditions for departments, job roles, and individual employees
  const orConditions: any[] = [];

  if (departments && departments.length > 0) {
    orConditions.push({
      departmentId: { in: departments },
    });
  }

  if (jobRoles && jobRoles.length > 0) {
    orConditions.push({
      jobRoleId: { in: jobRoles },
    });
  }

  if (employeeIds && employeeIds.length > 0) {
    orConditions.push({
      id: { in: employeeIds },
    });
  }

  if (orConditions.length > 0) {
    whereConditions.OR = orConditions;
  }

  const users = await prisma.user.findMany({
    where: whereConditions,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  // Remove duplicates (in case an employee is selected both individually and via department/role)
  const uniqueUsers = Array.from(
    new Map(users.map((user) => [user.id, user])).values()
  );

  return uniqueUsers;
}

async function getDepartmentDetails(companyId: string, departmentIds: string[]) {
  if (!departmentIds || departmentIds.length === 0) return [];

  const departments = await prisma.department.findMany({
    where: {
      companyId,
      id: { in: departmentIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  return departments;
}

async function getJobRoleDetails(companyId: string, jobRoleIds: string[]) {
  if (!jobRoleIds || jobRoleIds.length === 0) return [];

  const jobRoles = await prisma.jobRole.findMany({
    where: {
      companyId,
      id: { in: jobRoleIds },
    },
    select: {
      id: true,
      name: true,
    },
  });

  return jobRoles;
}

async function fetchReportData(
  companyId: string,
  fields: string[],
  filters?: any[],
  filterGroup?: any,
  sort?: any,
  timeZone?: string,
) {
  try {
    // Use the existing query builder
    const { queries } = buildDynamicQuery({
      selectedFields: fields,
      filters: filterGroup || filters || [],
      sort: sort || { field: "User.firstName", direction: "asc" },
      pagination: { page: 1, limit: 10000 },
    }, { timeZone });

    if (queries.length === 0) {
      return [];
    }

    // Execute the first query (primary model)
    const primary = queries[0];
    const model = primary.model as keyof typeof prisma;

    // Add company filter to the where clause
    const whereClause = {
      ...primary.prismaQuery.where,
      companyId,
    };

    // @ts-ignore dynamic model access
    let results = await (prisma[model] as any).findMany({
      ...primary.prismaQuery,
      where: whereClause,
    });

    // Attach computed fields
    results = await attachComputedFields(results, fields, primary.model);
    
    // Flatten results to make nested values accessible by their full path
    // This ensures PDF/CSV export can access values like "User.firstName" directly
    const flattenedResults = results.map((row: any) => {
      const flat: Record<string, any> = { ...row };
      flattenObject(row, '', flat);
      return flat;
    });
    
    return flattenedResults;
  } catch (error) {
    console.error("Error fetching report data:", error);
    throw error;
  }
}

// Helper to flatten nested objects into dot-notation keys
function flattenObject(obj: any, prefix: string, result: Record<string, any>): void {
  if (obj === null || obj === undefined) return;
  
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Recurse into nested objects
      flattenObject(value, newKey, result);
    } else {
      result[newKey] = value;
    }
  }
}

async function generateAttachment(
  reportName: string,
  data: any[],
  fields: string[],
  format: "PDF" | "EXCEL"
) {
  if (format === "PDF") {
    // Generate PDF - extract values using both direct access and nested path
    const columns = fields.map((field) => ({
      header: field.split(".").pop() || field,
      accessorKey: field,
    }));

    // Prepare data for PDF export - try direct access first, then nested path
    const preparedData = data.map((row) => {
      const prepared: Record<string, any> = {};
      columns.forEach((col) => {
        // Try direct access (for flattened data)
        let value = row[col.accessorKey];
        // If not found, try nested path
        if (value === undefined) {
          value = getNested(row, col.accessorKey);
        }
        prepared[col.accessorKey] = value ?? "";
      });
      return prepared;
    });

    const blob = await exportTableToPdf(reportName, preparedData, columns);
    const buffer = Buffer.from(await blob.arrayBuffer());

    return {
      filename: `${reportName.replace(/\s+/g, "_")}_${Date.now()}.pdf`,
      content: buffer,
    };
  } else {
    // Generate Excel/CSV
    const columns = fields.map((field) => ({
      header: field.split(".").pop() || field,
      accessorKey: field,
    }));

    const headers = columns.map((col) => col.header);
    const csvData = data.map((row) => {
      const obj: Record<string, any> = {};
      columns.forEach((col, idx) => {
        // Try direct access (for flattened data) first, then nested path
        let value = row[col.accessorKey];
        if (value === undefined) {
          value = getNested(row, col.accessorKey);
        }
        obj[headers[idx]] = value ?? "";
      });
      return obj;
    });

    const csv = Papa.unparse(csvData);
    const buffer = Buffer.from(csv, "utf-8");

    return {
      filename: `${reportName.replace(/\s+/g, "_")}_${Date.now()}.csv`,
      content: buffer,
    };
  }
}

function getNested(obj: any, path: string): any {
  return path.split(".").reduce((acc: any, key: string) => {
    if (acc === undefined || acc === null) return undefined;
    if (Array.isArray(acc)) acc = acc[0];
    return acc ? acc[key] : undefined;
  }, obj);
}

async function sendReportEmails(
  recipients: { email: string; firstName: string | null; lastName: string | null }[],
  subject: string,
  messageBody: string,
  reportName: string,
  attachment: { filename: string; content: Buffer },
  format: string
) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@peoplecore.co.nz";

  // Send to all recipients in batches to avoid rate limits
  const batchSize = 50;
  const batches = [];

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    batches.push(batch);
  }

  const results = [];

  for (const batch of batches) {
    for (const recipient of batch) {
      try {
        const firstName = recipient.firstName || "Team Member";
        const personalizedBody = messageBody
          .replace(/\{firstName\}/g, firstName)
          .replace(/\{name\}/g, `${firstName} ${recipient.lastName || ""}`);

        const result = await resend.emails.send({
          from: fromEmail,
          to: recipient.email,
          subject,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Report: ${reportName}</h2>
              ${personalizedBody ? `<p style="color: #666; line-height: 1.6;">${personalizedBody.replace(/\n/g, "<br>")}</p>` : ""}
              <p style="color: #666; line-height: 1.6;">
                Please find the attached ${format === "PDF" ? "PDF" : "Excel"} report.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #999; font-size: 12px;">
                This is an automated email from PeopleCore. Please do not reply to this email.
              </p>
            </div>
          `,
          attachments: [
            {
              filename: attachment.filename,
              content: attachment.content,
            },
          ],
        });

        results.push({ email: recipient.email, success: true, result });
      } catch (error) {
        console.error(`Failed to send email to ${recipient.email}:`, error);
        results.push({ email: recipient.email, success: false, error });
      }
    }
  }

  return results;
}

