import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import { auditLog } from "@/lib/audit";

const employeeImportSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  personalEmail: z.string().email("Valid personal email is required").optional(),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  nationalId: z.string().optional(),
  passportNumber: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  bankAccountNumber: z.string().optional(),
  bankRoutingNumber: z.string().optional(),
  bankName: z.string().optional(),
  taxId: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  employeeId: z.string().optional(),
  departmentName: z.string().optional(),
  jobTitle: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "TEMPORARY"]).optional(),
  contractType: z.enum(["PERMANENT", "FIXED_TERM", "PROBATIONARY", "CONSULTANT"]).optional(),
  startDate: z.string().optional(),
  salary: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  currency: z.string().optional(),
  workingPatternName: z.string().optional(),
  managerEmail: z.string().email().optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]).optional(),
  maritalStatus: z.enum(["SINGLE", "MARRIED", "DIVORCED", "WIDOWED", "SEPARATED", "CIVIL_PARTNERSHIP"]).optional(),
});

type EmployeeImportData = z.infer<typeof employeeImportSchema>;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
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
      created: [] as Array<{ id: string; email: string; name: string }>,
    };

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 because CSV headers are row 1, data starts at row 2

      try {
        // Validate the record
        const validatedData = employeeImportSchema.parse(record);
        
        // Check if employee already exists
        const existingEmployee = await prisma.employee.findFirst({
          where: {
            OR: [
              { email: validatedData.email },
              { personalEmail: validatedData.personalEmail },
              ...(validatedData.employeeId ? [{ employeeId: validatedData.employeeId }] : []),
            ],
          },
        });

        if (existingEmployee) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            errors: [`Employee with email ${validatedData.email} already exists`],
          });
          continue;
        }

        // Find or create department
        let department = null;
        if (validatedData.departmentName) {
          department = await prisma.department.findFirst({
            where: { name: validatedData.departmentName },
          });
          
          if (!department) {
            department = await prisma.department.create({
              data: {
                name: validatedData.departmentName,
                description: `Auto-created during CSV import`,
                companyId: session.user.companyId,
              },
            });
          }
        }

        // Find or create job role
        let jobRole = null;
        if (validatedData.jobTitle) {
          jobRole = await prisma.jobRole.findFirst({
            where: { 
              title: validatedData.jobTitle,
              departmentId: department?.id,
            },
          });
          
          if (!jobRole && department) {
            jobRole = await prisma.jobRole.create({
              data: {
                title: validatedData.jobTitle,
                description: `Auto-created during CSV import`,
                departmentId: department.id,
              },
            });
          }
        }

        // Find manager if provided
        let manager = null;
        if (validatedData.managerEmail) {
          manager = await prisma.employee.findFirst({
            where: { email: validatedData.managerEmail },
          });
        }

        // Find working pattern if provided
        let workingPattern = null;
        if (validatedData.workingPatternName) {
          workingPattern = await prisma.workingPattern.findFirst({
            where: { name: validatedData.workingPatternName },
          });
        }

        // Create employee
        const employee = await prisma.employee.create({
          data: {
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            email: validatedData.email,
            personalEmail: validatedData.personalEmail,
            phoneNumber: validatedData.phoneNumber,
            dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
            address: validatedData.address,
            city: validatedData.city,
            state: validatedData.state,
            postalCode: validatedData.postalCode,
            country: validatedData.country,
            nationalId: validatedData.nationalId,
            passportNumber: validatedData.passportNumber,
            emergencyContactName: validatedData.emergencyContactName,
            emergencyContactPhone: validatedData.emergencyContactPhone,
            emergencyContactRelationship: validatedData.emergencyContactRelationship,
            bankAccountNumber: validatedData.bankAccountNumber,
            bankRoutingNumber: validatedData.bankRoutingNumber,
            bankName: validatedData.bankName,
            taxId: validatedData.taxId,
            socialSecurityNumber: validatedData.socialSecurityNumber,
            employeeId: validatedData.employeeId,
            departmentId: department?.id,
            jobRoleId: jobRole?.id,
            employmentType: validatedData.employmentType,
            contractType: validatedData.contractType,
            startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
            salary: validatedData.salary,
            currency: validatedData.currency,
            workingPatternId: workingPattern?.id,
            managerId: manager?.id,
            gender: validatedData.gender,
            maritalStatus: validatedData.maritalStatus,
            companyId: session.user.companyId,
            status: "ACTIVE",
          },
        });

        // Create audit log entry
        await auditLog({
          entityType: "EMPLOYEE",
          entityId: employee.id,
          action: "CREATED",
          actorId: session.user.id,
          actorType: "USER",
          changes: {
            source: "CSV_IMPORT",
            importedFields: Object.keys(validatedData),
          },
          metadata: {
            importBatch: `csv_import_${Date.now()}`,
            rowNumber,
          },
        });

        results.successful++;
        results.created.push({
          id: employee.id,
          email: employee.email,
          name: `${employee.firstName} ${employee.lastName}`,
        });

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
      changes: {
        totalRecords: results.total,
        successful: results.successful,
        failed: results.failed,
        fileName: file.name,
      },
      metadata: {
        importType: "EMPLOYEES",
        errors: results.errors,
      },
    });

    return NextResponse.json({
      message: "Import completed",
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sample data for template
    const departments = await prisma.department.findMany({
      where: { companyId: session.user.companyId },
      take: 3,
    });

    const jobRoles = await prisma.jobRole.findMany({
      where: { department: { companyId: session.user.companyId } },
      take: 3,
    });

    const workingPatterns = await prisma.workingPattern.findMany({
      where: { companyId: session.user.companyId },
      take: 3,
    });

    // Create template CSV content
    const headers = [
      "firstName",
      "lastName", 
      "email",
      "personalEmail",
      "phoneNumber",
      "dateOfBirth",
      "address",
      "city",
      "state",
      "postalCode",
      "country",
      "nationalId",
      "passportNumber",
      "emergencyContactName",
      "emergencyContactPhone",
      "emergencyContactRelationship",
      "bankAccountNumber",
      "bankRoutingNumber",
      "bankName",
      "taxId",
      "socialSecurityNumber",
      "employeeId",
      "departmentName",
      "jobTitle",
      "employmentType",
      "contractType",
      "startDate",
      "salary",
      "currency",
      "workingPatternName",
      "managerEmail",
      "gender",
      "maritalStatus",
    ];

    const sampleData = [
      [
        "John",
        "Doe",
        "john.doe@company.com",
        "john.doe.personal@gmail.com",
        "+1-555-0123",
        "1990-01-15",
        "123 Main St",
        "New York",
        "NY",
        "10001",
        "USA",
        "123456789",
        "AB1234567",
        "Jane Doe",
        "+1-555-0124",
        "Spouse",
        "1234567890",
        "021000021",
        "Chase Bank",
        "12-3456789",
        "123-45-6789",
        "EMP001",
        departments[0]?.name || "Engineering",
        jobRoles[0]?.title || "Software Engineer",
        "FULL_TIME",
        "PERMANENT",
        "2024-01-01",
        "75000",
        "USD",
        workingPatterns[0]?.name || "Standard",
        "manager@company.com",
        "MALE",
        "MARRIED",
      ],
      [
        "Jane",
        "Smith",
        "jane.smith@company.com",
        "jane.smith.personal@gmail.com",
        "+1-555-0125",
        "1985-05-20",
        "456 Oak Ave",
        "San Francisco",
        "CA",
        "94102",
        "USA",
        "987654321",
        "CD9876543",
        "John Smith",
        "+1-555-0126",
        "Spouse",
        "0987654321",
        "021000021",
        "Bank of America",
        "98-7654321",
        "987-65-4321",
        "EMP002",
        departments[1]?.name || "Marketing",
        jobRoles[1]?.title || "Marketing Manager",
        "FULL_TIME",
        "PERMANENT",
        "2024-01-15",
        "85000",
        "USD",
        workingPatterns[0]?.name || "Standard",
        "director@company.com",
        "FEMALE",
        "SINGLE",
      ],
    ];

    const csvContent = [
      headers.join(","),
      ...sampleData.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=employee_import_template.csv",
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
