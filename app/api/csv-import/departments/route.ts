import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import { auditLog } from "@/lib/audit";

const departmentImportSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  description: z.string().optional(),
  headEmail: z.string().email().optional(),
  code: z.string().optional(),
  active: z.string().transform(val => val?.toLowerCase() === 'true' || val?.toLowerCase() === 'yes' || val === '1').optional(),
});

type DepartmentImportData = z.infer<typeof departmentImportSchema>;

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
        const validatedData = departmentImportSchema.parse(record);
        
        // Check if department already exists
        const existingDepartment = await prisma.department.findFirst({
          where: { 
            name: validatedData.name,
            companyId: session.user.companyId,
          },
        });

        // Find department head if provided (tenant-scoped, case-insensitive)
        let headId = null;
        if (validatedData.headEmail) {
          const headUser = await prisma.user.findFirst({
            where: { 
              email: { equals: validatedData.headEmail, mode: 'insensitive' },
              companyId: session.user.companyId,
            },
          });
          headId = headUser?.id || null;
        }

        if (existingDepartment) {
          // Update existing department
          const updatedDepartment = await prisma.department.update({
            where: { id: existingDepartment.id },
            data: {
              description: validatedData.description || existingDepartment.description,
              headId: headId || existingDepartment.headId,
              code: validatedData.code || existingDepartment.code,
              active: validatedData.active !== undefined ? validatedData.active : existingDepartment.active,
              updatedAt: new Date(),
            },
          });

          // Create audit log entry
          await auditLog({
            entityType: "DEPARTMENT",
            entityId: updatedDepartment.id,
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
            id: updatedDepartment.id,
            name: updatedDepartment.name,
          });
        } else {
          // Create new department
          const department = await prisma.department.create({
            data: {
              id: crypto.randomUUID(),
              name: validatedData.name,
              description: validatedData.description || null,
              headId: headId,
              code: validatedData.code || null,
              active: validatedData.active !== undefined ? validatedData.active : true,
              companyId: session.user.companyId,
              updatedAt: new Date(),
            },
          });

          // Create audit log entry
          await auditLog({
            entityType: "DEPARTMENT",
            entityId: department.id,
            action: "CREATED",
            actorId: session.user.id,
            actorType: "USER",
            companyId: session.user.companyId,
            metadata: {
              source: "CSV_IMPORT",
              importBatch: `csv_import_${Date.now()}`,
              rowNumber,
              createdFields: Object.keys(validatedData),
            },
          });

          results.successful++;
          results.created.push({
            id: department.id,
            name: department.name,
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
        importType: "DEPARTMENTS",
        totalRecords: results.total,
        successful: results.successful,
        failed: results.failed,
        fileName: file.name,
        errors: results.errors,
      },
    });

    return NextResponse.json({
      message: "Department import completed",
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
    const existingDepartments = await prisma.department.findMany({
      where: { companyId: session.user.companyId },
      take: 3,
    });

    // Create template CSV content
    const headers = [
      "name",
      "description",
      "headEmail",
      "code",
      "active",
    ];

    const sampleData = [
      [
        "Engineering",
        "Software development and technical operations",
        "cto@company.com",
        "ENG",
        "true",
      ],
      [
        "Marketing",
        "Brand management and customer acquisition",
        "cmo@company.com",
        "MKT",
        "true",
      ],
      [
        "Human Resources",
        "People operations and talent management",
        "chro@company.com",
        "HR",
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
        "Content-Disposition": "attachment; filename=departments_import_template.csv",
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
