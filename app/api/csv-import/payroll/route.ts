import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { parse } from "csv-parse/sync";
import { z } from "zod";
import { auditLog } from "@/lib/audit";
import { TaxCode } from "@prisma/client";

const payrollImportSchema = z.object({
  email: z.string().email("Valid employee email is required"),
  bankAccountNumber: z.string().optional(),
  irdNumber: z.string().optional(),
  taxCode: z.string().optional(),
  kiwiSaverEnrolled: z.string().optional(),
  kiwiSaverContribution: z.string().optional(),
  salaryAmount: z.string().optional(),
  hourlyRate: z.string().optional(),
});

const trimToUndefined = (value?: string | null) => {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const parseOptionalNumber = (value: string | undefined, label: string) => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const normalised = trimmed.replace(/,/g, "");
  const parsed = Number(normalised);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label} "${trimmed}". Please provide a numeric value.`);
  }
  return parsed;
};

const parseOptionalInteger = (value: string | undefined, label: string) => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label} "${trimmed}". Please provide a whole number.`);
  }
  return parsed;
};

const parseOptionalBoolean = (value: string | undefined) => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const normalised = trimmed.toLowerCase();
  if (["true", "yes", "1", "y"].includes(normalised)) return true;
  if (["false", "no", "0", "n"].includes(normalised)) return false;
  throw new Error(`Invalid boolean value "${value}". Use Yes/No or True/False.`);
};

const TAX_CODE_LOOKUP: Record<string, TaxCode> = {
  M: TaxCode.M,
  ME: TaxCode.ME,
  "M SL": TaxCode.M_SL,
  MSL: TaxCode.M_SL,
  M_SL: TaxCode.M_SL,
  "ME SL": TaxCode.ME_SL,
  MESL: TaxCode.ME_SL,
  ME_SL: TaxCode.ME_SL,
  SB: TaxCode.SB,
  "SB SL": TaxCode.SB_SL,
  SBSL: TaxCode.SB_SL,
  SB_SL: TaxCode.SB_SL,
  S: TaxCode.S,
  "S SL": TaxCode.S_SL,
  SSL: TaxCode.S_SL,
  S_SL: TaxCode.S_SL,
  SH: TaxCode.SH,
  "SH SL": TaxCode.SH_SL,
  SHSL: TaxCode.SH_SL,
  SH_SL: TaxCode.SH_SL,
  ST: TaxCode.ST,
  "ST SL": TaxCode.ST_SL,
  STSL: TaxCode.ST_SL,
  ST_SL: TaxCode.ST_SL,
  SA: TaxCode.SA,
  "SA SL": TaxCode.SA_SL,
  SASL: TaxCode.SA_SL,
  SA_SL: TaxCode.SA_SL,
  SL: TaxCode.SL,
  SED: TaxCode.SED,
  STC: TaxCode.STC,
  CAE: TaxCode.CAE,
  EDW: TaxCode.EDW,
  ND: TaxCode.ND,
  NS: TaxCode.NS,
  NC: TaxCode.NC,
  NCC: TaxCode.NCC,
  WT: TaxCode.WT,
  P: TaxCode.P,
};

const normaliseTaxCode = (value: string | undefined): TaxCode | undefined => {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  const withSpaces = upper.replace(/[_-]+/g, " ");
  const condensed = withSpaces.replace(/\s+/g, "");
  return TAX_CODE_LOOKUP[withSpaces] || TAX_CODE_LOOKUP[condensed];
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

    const importBatchId = `payroll_csv_import_${Date.now()}`;

    for (let index = 0; index < records.length; index++) {
      const record = records[index];
      const rowNumber = index + 2;

      try {
        const validated = payrollImportSchema.parse(record);
        const employee = await findEmployee(session.user.companyId, validated.email);

        if (!employee) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            errors: [`Employee with email "${validated.email}" not found. Import employee core data first.`],
          });
          continue;
        }

        const updateData: Record<string, unknown> = {};

        if (validated.bankAccountNumber !== undefined) {
          const trimmed = trimToUndefined(validated.bankAccountNumber);
          updateData.bankAccountNumber = trimmed ?? null;
        }

        if (validated.irdNumber !== undefined) {
          const trimmed = trimToUndefined(validated.irdNumber);
          updateData.irdNumber = trimmed ?? null;
        }

        if (validated.taxCode !== undefined) {
          const trimmed = trimToUndefined(validated.taxCode);
          const normalised = normaliseTaxCode(trimmed ?? undefined);
          updateData.taxCode = normalised ?? null;
        }

        if (validated.kiwiSaverEnrolled !== undefined) {
          const parsed = parseOptionalBoolean(validated.kiwiSaverEnrolled);
          updateData.kiwiSaverEnrolled = parsed ?? null;
        }

        if (validated.kiwiSaverContribution !== undefined) {
          const parsed = parseOptionalInteger(validated.kiwiSaverContribution, "kiwiSaverContribution");
          updateData.kiwiSaverContribution = parsed ?? null;
        }

        if (validated.salaryAmount !== undefined) {
          const parsed = parseOptionalNumber(validated.salaryAmount, "salaryAmount");
          updateData.salaryAmount = parsed ?? null;
        }

        if (validated.hourlyRate !== undefined) {
          const parsed = parseOptionalNumber(validated.hourlyRate, "hourlyRate");
          updateData.hourlyRate = parsed ?? null;
        }

        const hasUpdates = Object.keys(updateData).length > 0;
        if (!hasUpdates) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            errors: ["No payroll values supplied. Fill at least one payroll column before importing."],
          });
          continue;
        }

        await prisma.employee.update({
          where: { id: employee.id },
          data: updateData,
        });

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
        importType: "PAYROLL",
        totalRecords: results.total,
        successful: results.successful,
        failed: results.failed,
        fileName: file.name,
        errors: results.errors,
      },
    });

    return NextResponse.json({
      message: "Payroll import completed",
      results,
    });
  } catch (error) {
    console.error("Payroll CSV import error", error);
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
      "bankAccountNumber",
      "irdNumber",
      "taxCode",
      "kiwiSaverEnrolled",
      "kiwiSaverContribution",
      "salaryAmount",
      "hourlyRate",
    ];

    const sampleRows = [
      [
        "john.doe@company.com",
        "12-1234-1234567-00",
        "123-456-789",
        "M",
        "Yes",
        "3",
        "85000",
        "",
      ],
      [
        "jane.smith@company.com",
        "98-7654-0987654-00",
        "987-654-321",
        "ME SL",
        "No",
        "",
        "",
        "45",
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=payroll_import_template.csv",
      },
    });
  } catch (error) {
    console.error("Payroll template generation error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
