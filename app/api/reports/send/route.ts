import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";
import { exportTableToPdf } from "@/lib/pdfExport";
import { buildDynamicQuery, attachComputedFields } from "@/lib/queryBuilder";
import Papa from "papaparse";

export const runtime = "nodejs";

interface SendReportRequest {
  reportId: number;
  reportName: string;
  departments: string[]; // Array of department IDs
  jobRoles: string[]; // Array of job role IDs
  format: "PDF" | "EXCEL";
  subject: string;
  messageBody?: string;
  fields: string[];
  filters?: any[];
  sort?: any;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SendReportRequest = await req.json();
    const {
      reportId,
      reportName,
      departments,
      jobRoles,
      format,
      subject,
      messageBody,
      fields,
      filters,
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
      (!jobRoles || jobRoles.length === 0)
    ) {
      return NextResponse.json(
        { error: "Please select at least one department or job role" },
        { status: 400 }
      );
    }

    // Fetch recipients based on department/job role filters
    const recipients = await getRecipients(
      session.user.companyId,
      departments,
      jobRoles
    );

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "No recipients found matching the selected filters" },
        { status: 400 }
      );
    }

    // Fetch report data
    const reportData = await fetchReportData(
      session.user.companyId,
      fields,
      filters,
      sort
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
  jobRoles: string[]
) {
  const whereConditions: any = {
    companyId,
    isActivated: true,
  };

  // Build OR conditions for departments and job roles
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

  return users;
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
  sort?: any
) {
  try {
    // Use the existing query builder
    const query = buildDynamicQuery({
      fields,
      filters: filters || [],
      sort: sort || { field: "User.firstName", direction: "asc" },
      page: 1,
      pageSize: 10000, // Get all records for export
      companyId,
    });

    const results = await prisma.$queryRawUnsafe<any[]>(
      query.sql,
      ...query.params
    );

    // Attach computed fields
    const enriched = attachComputedFields(results, fields);
    return enriched;
  } catch (error) {
    console.error("Error fetching report data:", error);
    throw error;
  }
}

async function generateAttachment(
  reportName: string,
  data: any[],
  fields: string[],
  format: "PDF" | "EXCEL"
) {
  if (format === "PDF") {
    // Generate PDF
    const columns = fields.map((field) => ({
      header: field.split(".").pop() || field,
      accessorKey: field,
    }));

    const blob = await exportTableToPdf(reportName, data, columns);
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
        obj[headers[idx]] = getNested(row, col.accessorKey) ?? "";
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

