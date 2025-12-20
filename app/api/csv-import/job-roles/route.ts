import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import { auditLog } from "@/lib/audit";

const jobRoleImportSchema = z.object({
  name: z.string().min(1, "Job role name is required"),
  description: z.string().optional(),
  departmentName: z.string().min(1, "Department name is required"),
  level: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  payGrade: z.string().optional(),
  active: z.string().transform(val => val?.toLowerCase() === 'true' || val?.toLowerCase() === 'yes' || val === '1').optional(),
});

type JobRoleImportData = z.infer<typeof jobRoleImportSchema>;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const csvContent = await file.text();
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    const results = {
      total: records.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; errors: string[] }>,
      created: [] as Array<{ id: string; name: string }>,
      updated: [] as Array<{ id: string; name: string }>,
    };

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 because CSV headers are row 1, data starts at row 2

      try {
        // Validate the record
        const validatedData = jobRoleImportSchema.parse(record);
        
        // Find the department
        const department = await prisma.department.findFirst({
          where: { 
            name: validatedData.departmentName,
            companyId: session.user.companyId,
          },
        });

        if (!department) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            errors: [`Department "${validatedData.departmentName}" not found. Please import departments first.`],
          });
          continue;
        }

        // Check if job role already exists
        const existingJobRole = await prisma.jobRole.findFirst({
          where: { 
            name: validatedData.name,
            companyId: session.user.companyId,
          },
        });

        if (existingJobRole) {
          // Update existing job role
          const updatedJobRole = await prisma.jobRole.update({
            where: { id: existingJobRole.id },
            data: {
              description: validatedData.description || existingJobRole.description,
              level: validatedData.level || existingJobRole.level,
              payGrade: validatedData.payGrade || existingJobRole.payGrade,
              active: validatedData.active !== undefined ? validatedData.active : existingJobRole.active,
              departmentId: department.id,
              updatedAt: new Date(),
            },
          });

          // Create audit log entry
          await auditLog({
            entityType: "JOB_ROLE",
            entityId: updatedJobRole.id,
            action: "UPDATED",
            actorId: session.user.id,
            actorType: "USER",
            companyId: session.user.companyId,
            metadata: {
              source: "CSV_IMPORT",
              importBatch: `csv_import_${Date.now()}`,
              rowNumber,
              changes: validatedData,
            },
          });

          results.successful++;
          results.updated.push({
            id: updatedJobRole.id,
            name: updatedJobRole.name,
          });
        } else {
          // Create new job role
          const jobRole = await prisma.jobRole.create({
            data: {
              id: crypto.randomUUID(),
              name: validatedData.name,
              description: validatedData.description || null,
              level: validatedData.level || null,
              payGrade: validatedData.payGrade || null,
              active: validatedData.active !== undefined ? validatedData.active : true,
              companyId: session.user.companyId,
              departmentId: department.id,
              updatedAt: new Date(),
            },
          });

          // Create audit log entry
          await auditLog({
            entityType: "JOB_ROLE",
            entityId: jobRole.id,
            action: "CREATED",
            actorId: session.user.id,
            actorType: "USER",
            companyId: session.user.companyId,
            metadata: {
              source: "CSV_IMPORT",
              importBatch: `csv_import_${Date.now()}`,
              rowNumber,
              createdFields: Object.keys(validatedData),
              departmentName: validatedData.departmentName,
            },
          });

          results.successful++;
          results.created.push({
            id: jobRole.id,
            name: jobRole.name,
          });
        }

      } catch (error) {
        results.failed++;
        if (error instanceof z.ZodError) {
          results.errors.push({
            row: rowNumber,
            errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
          });
        } else {
          results.errors.push({
            row: rowNumber,
            errors: [error instanceof Error ? error.message : "Unknown error"],
          });
        }
      }
    }

    // Create audit log for the entire import
    await auditLog({
      entityType: "CSV_IMPORT",
      entityId: `batch_${Date.now()}`,
      action: "COMPLETED",
      actorId: session.user.id,
      actorType: "USER",
      companyId: session.user.companyId,
      metadata: {
        importType: "JOB_ROLES",
        totalRecords: results.total,
        successful: results.successful,
        failed: results.failed,
        fileName: file.name,
        errors: results.errors,
      },
    });

    return NextResponse.json({
      message: "Job roles import completed",
      results,
    });

  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Template generation endpoint
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sample data for template
    const departments = await prisma.department.findMany({
      where: { companyId: session.user.companyId },
      take: 3,
    });

    // Create template CSV content
    const headers = [
      "name",
      "description",
      "departmentName",
      "level",
      "payGrade",
      "active",
    ];

    const sampleData = [
      [
        "Software Engineer",
        "Develops and maintains software applications",
        departments[0]?.name || "Engineering",
        "3",
        "L3",
        "true",
      ],
      [
        "Senior Software Engineer",
        "Leads technical projects and mentors junior engineers",
        departments[0]?.name || "Engineering",
        "4",
        "L4",
        "true",
      ],
      [
        "Marketing Manager",
        "Manages marketing campaigns and brand strategy",
        departments[1]?.name || "Marketing",
        "3",
        "M3",
        "true",
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=job_roles_import_template.csv",
      },
    });

  } catch (error) {
    console.error("Template generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
