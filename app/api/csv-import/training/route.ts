import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { auditLog } from "@/lib/audit";

const trainingImportSchema = z.object({
  email: z.string().email("Valid employee email is required"),
  trainingCourse: z.string().optional(),
  trainingProvider: z.string().optional(),
  trainingDateCompleted: z.string().optional(),
  trainingExpiryDate: z.string().optional(),
  employmentCheckType: z.string().optional(),
  employmentCheckDocumentNumber: z.string().optional(),
  employmentCheckIssueDate: z.string().optional(),
  employmentCheckExpiryDate: z.string().optional(),
});

const trimToUndefined = (value?: string | null) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const parseOptionalDate = (value: string | undefined, label: string) => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label} "${trimmed}". Use YYYY-MM-DD format.`);
  }
  return parsed;
};

const findEmployee = async (companyId: string, email: string) => {
  return prisma.employee.findFirst({
    where: {
      companyId,
      User: { email: { equals: email, mode: "insensitive" } },
    },
    select: {
      id: true,
      User: {
        select: {
          email: true,
          firstName: true,
          lastName: true,
          name: true,
        },
      },
    },
  });
};

const ensureCourse = async (companyId: string, name: string) => {
  const existing = await prisma.course.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      OR: [{ companyId }, { companyId: null }],
    },
  });

  if (existing) return existing;

  return prisma.course.create({
    data: {
      id: crypto.randomUUID(),
      name,
      companyId,
    },
  });
};

const ensureTrainingProvider = async (companyId: string, name: string) => {
  const existing = await prisma.trainingProvider.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      OR: [{ companyId }, { companyId: null }],
    },
  });

  if (existing) return existing;

  return prisma.trainingProvider.create({
    data: {
      id: crypto.randomUUID(),
      name,
      companyId,
    },
  });
};

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
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
      created: [] as Array<{ id: string; email: string; name: string }>,
      updated: [] as Array<{ id: string; email: string; name: string }>,
    };

    const importBatchId = `training_csv_import_${Date.now()}`;

    for (let index = 0; index < records.length; index++) {
      const record = records[index];
      const rowNumber = index + 2;

      try {
        const validated = trainingImportSchema.parse(record);
        const employee = await findEmployee(session.user.companyId, validated.email);

        if (!employee) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            errors: [`Employee with email "${validated.email}" not found. Import employee core data first.`],
          });
          continue;
        }

        const trainingCourse = trimToUndefined(validated.trainingCourse);
        const trainingProvider = trimToUndefined(validated.trainingProvider);
        const trainingDateCompleted = parseOptionalDate(validated.trainingDateCompleted, "trainingDateCompleted");
        const trainingExpiryDate = parseOptionalDate(validated.trainingExpiryDate, "trainingExpiryDate");
        const employmentCheckType = trimToUndefined(validated.employmentCheckType);
        const employmentCheckDocumentNumber = trimToUndefined(validated.employmentCheckDocumentNumber);
        const employmentCheckIssueDate = parseOptionalDate(validated.employmentCheckIssueDate, "employmentCheckIssueDate");
        const employmentCheckExpiryDate = parseOptionalDate(validated.employmentCheckExpiryDate, "employmentCheckExpiryDate");

        const hasTraining = Boolean(trainingCourse || trainingProvider || trainingDateCompleted);
        const hasEmploymentCheck = Boolean(employmentCheckType || employmentCheckDocumentNumber || employmentCheckIssueDate || employmentCheckExpiryDate);

        if (!hasTraining && !hasEmploymentCheck) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            errors: ["No training or employment check values supplied. Populate relevant columns before importing."],
          });
          continue;
        }

        if (hasTraining) {
          if (!trainingCourse || !trainingProvider || !trainingDateCompleted) {
            throw new Error(
              "Training section requires trainingCourse, trainingProvider, and trainingDateCompleted when any training data is supplied.",
            );
          }

          const course = await ensureCourse(session.user.companyId, trainingCourse);
          const provider = await ensureTrainingProvider(session.user.companyId, trainingProvider);

          const existingTraining = await prisma.trainingRecord.findFirst({
            where: {
              employeeId: employee.id,
              courseId: course.id,
              providerId: provider.id,
            },
          });

          if (existingTraining) {
            await prisma.trainingRecord.update({
              where: { id: existingTraining.id },
              data: {
                dateCompleted: trainingDateCompleted!,
                expiryDate: trainingExpiryDate ?? null,
                updatedAt: new Date(),
              },
            });
          } else {
            await prisma.trainingRecord.create({
              data: {
                id: crypto.randomUUID(),
                employeeId: employee.id,
                courseId: course.id,
                providerId: provider.id,
                dateCompleted: trainingDateCompleted!,
                expiryDate: trainingExpiryDate ?? null,
                updatedAt: new Date(),
              },
            });
          }
        }

        if (hasEmploymentCheck) {
          if (!employmentCheckType || !employmentCheckDocumentNumber || !employmentCheckIssueDate || !employmentCheckExpiryDate) {
            throw new Error(
              "Employment check section requires employmentCheckType, employmentCheckDocumentNumber, employmentCheckIssueDate, and employmentCheckExpiryDate when any value is provided.",
            );
          }

          const existingCheck = await prisma.employmentCheck.findFirst({
            where: {
              employeeId: employee.id,
              typeOfCheck: employmentCheckType,
            },
          });

          if (existingCheck) {
            await prisma.employmentCheck.update({
              where: { id: existingCheck.id },
              data: {
                documentNumber: employmentCheckDocumentNumber,
                dateOfIssue: employmentCheckIssueDate!,
                expiryDate: employmentCheckExpiryDate!,
                updatedAt: new Date(),
              },
            });
          } else {
            await prisma.employmentCheck.create({
              data: {
                id: crypto.randomUUID(),
                employeeId: employee.id,
                typeOfCheck: employmentCheckType,
                documentNumber: employmentCheckDocumentNumber,
                dateOfIssue: employmentCheckIssueDate!,
                expiryDate: employmentCheckExpiryDate!,
                updatedAt: new Date(),
              },
            });
          }
        }

        results.successful++;
        const displayName =
          employee.User?.name && employee.User.name.trim().length > 0
            ? employee.User.name
            : `${employee.User?.firstName ?? ""} ${employee.User?.lastName ?? ""}`.trim() ||
              employee.User?.email ||
              validated.email;

        results.updated.push({
          id: employee.id,
          email: employee.User?.email ?? validated.email,
          name: displayName,
        });
      } catch (error) {
        results.failed++;
        if (error instanceof z.ZodError) {
          results.errors.push({
            row: rowNumber,
            errors: error.errors.map(err => `${err.path.join(".")}: ${err.message}`),
          });
        } else {
          results.errors.push({
            row: rowNumber,
            errors: [error instanceof Error ? error.message : "Unknown error"],
          });
        }
      }
    }

    await auditLog({
      entityType: "CSV_IMPORT",
      entityId: importBatchId,
      action: "COMPLETED",
      actorId: session.user.id,
      actorType: "USER",
      companyId: session.user.companyId,
      metadata: {
        importType: "TRAINING",
        totalRecords: results.total,
        successful: results.successful,
        failed: results.failed,
        fileName: file.name,
        errors: results.errors,
      },
    });

    return NextResponse.json({
      message: "Training import completed",
      results,
    });
  } catch (error) {
    console.error("Training CSV import error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const headers = [
      "email",
      "trainingCourse",
      "trainingProvider",
      "trainingDateCompleted",
      "trainingExpiryDate",
      "employmentCheckType",
      "employmentCheckDocumentNumber",
      "employmentCheckIssueDate",
      "employmentCheckExpiryDate",
    ];

    const sampleRows = [
      [
        "john.doe@company.com",
        "Health & Safety Induction",
        "Safety First Ltd",
        "2024-01-15",
        "2026-01-15",
        "Right to Work",
        "RTW-2024-001",
        "2023-12-01",
        "2025-12-01",
      ],
      [
        "jane.smith@company.com",
        "Advanced Leadership",
        "People Leaders NZ",
        "2023-11-20",
        "",
        "Police Vetting",
        "PV-2023-045",
        "2023-11-15",
        "2025-11-15",
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=training_import_template.csv",
      },
    });
  } catch (error) {
    console.error("Training template generation error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
