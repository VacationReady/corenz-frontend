import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import { auditLog } from "@/lib/audit";

const employeeImportSchema = z.object({
  // Personal Information (User model)
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  postalCode: z.string().optional(),
  nationalId: z.string().optional(),
  pronouns: z.string().optional(),
  residencyStatus: z.string().optional(),
  
  // Emergency Contact (User model)
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  
  // Employment Information (Employee model)
  departmentName: z.string().optional(),
  jobTitle: z.string().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "TEMPORARY"]).optional(),
  contractType: z.enum(["PERMANENT", "FIXED_TERM", "PROBATIONARY", "CONSULTANT"]).optional(),
  startDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  siteLocation: z.string().optional(),
  
  // Compensation (Employee model)
  salary: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  hourlyRate: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  workingPatternName: z.string().optional(),
  
  // Banking & Tax (Employee model)
  bankAccountNumber: z.string().optional(),
  irdNumber: z.string().optional(),
  taxCode: z.string().optional(),
  
  // KiwiSaver (Employee model)
  kiwiSaverEnrolled: z.string().transform(val => val?.toLowerCase() === 'true' || val?.toLowerCase() === 'yes' || val === '1').optional(),
  kiwiSaverContribution: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  
  // Management
  managerEmail: z.string().email().optional(),
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
        
        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            email: validatedData.email,
          },
        });

        if (existingUser) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            errors: [`User with email ${validatedData.email} already exists`],
          });
          continue;
        }

        // Find department (must exist)
        let department = null;
        if (validatedData.departmentName) {
          department = await prisma.department.findFirst({
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
        }

        // Find job role (must exist)
        let jobRole = null;
        if (validatedData.jobTitle) {
          jobRole = await prisma.jobRole.findFirst({
            where: { 
              name: validatedData.jobTitle,
              companyId: session.user.companyId,
            },
          });
          
          if (!jobRole) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              errors: [`Job role "${validatedData.jobTitle}" not found. Please import job roles first.`],
            });
            continue;
          }
        }

        // Find manager if provided
        let manager = null;
        if (validatedData.managerEmail) {
          const managerUser = await prisma.user.findFirst({
            where: { email: validatedData.managerEmail },
          });
          if (managerUser) {
            manager = await prisma.employee.findFirst({
              where: { userId: managerUser.id },
            });
          }
        }

        // Find working pattern (must exist if provided)
        let workingPattern = null;
        if (validatedData.workingPatternName) {
          workingPattern = await prisma.workingPattern.findFirst({
            where: { 
              name: validatedData.workingPatternName,
              companyId: session.user.companyId,
            },
          });
          
          if (!workingPattern) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              errors: [`Working pattern "${validatedData.workingPatternName}" not found. Please import working patterns first.`],
            });
            continue;
          }
        }

        // Create user first
        const user = await prisma.user.create({
          data: {
            id: crypto.randomUUID(),
            email: validatedData.email,
            password: "temp-password", // Will need to be reset
            firstName: validatedData.firstName,
            lastName: validatedData.lastName,
            phone: validatedData.phoneNumber,
            dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : null,
            addressCity: validatedData.city,
            addressCountry: validatedData.country,
            addressPostcode: validatedData.postalCode,
            addressStreet: validatedData.address,
            emergencyContactName: validatedData.emergencyContactName,
            emergencyContactPhone: validatedData.emergencyContactPhone,
            emergencyContactRelationship: validatedData.emergencyContactRelationship,
            nationalId: validatedData.nationalId,
            pronouns: validatedData.pronouns,
            residencyStatus: validatedData.residencyStatus,
            companyId: session.user.companyId,
            isActivated: false, // Will need to activate
            updatedAt: new Date(),
          },
        });

        // Create employee
        const employee = await prisma.employee.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            bankAccountNumber: validatedData.bankAccountNumber,
            contractType: validatedData.contractType,
            employmentType: validatedData.employmentType,
            salaryAmount: validatedData.salary,
            hourlyRate: validatedData.hourlyRate,
            startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
            contractEndDate: validatedData.contractEndDate ? new Date(validatedData.contractEndDate) : null,
            siteLocation: validatedData.siteLocation,
            irdNumber: validatedData.irdNumber,
            taxCode: validatedData.taxCode as any,
            kiwiSaverEnrolled: validatedData.kiwiSaverEnrolled,
            kiwiSaverContribution: validatedData.kiwiSaverContribution,
            departmentId: department?.id,
            jobRoleId: jobRole?.id,
            workingPatternId: workingPattern?.id,
            companyId: session.user.companyId,
            isActive: true,
            updatedAt: new Date(),
          },
        });

        // Create audit log entry
        await auditLog({
          entityType: "EMPLOYEE",
          entityId: employee.id,
          action: "CREATED",
          actorId: session.user.id,
          actorType: "USER",
          companyId: session.user.companyId,
          employeeId: employee.id,
          section: "CSV_IMPORT",
          field: "__create__",
          oldValue: undefined,
          newValue: "Employee created via CSV import",
          reason: "CSV Import",
          metadata: {
            importBatch: `csv_import_${Date.now()}`,
            rowNumber,
            importedFields: Object.keys(validatedData),
          },
        });

        results.successful++;
        results.created.push({
          id: employee.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
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
      where: { companyId: session.user.companyId },
      take: 3,
    });

    const workingPatterns = await prisma.workingPattern.findMany({
      where: { companyId: session.user.companyId },
      take: 3,
    });

    // Create template CSV content
    const headers = [
      // Personal Information
      "firstName",
      "lastName", 
      "email",
      "phoneNumber",
      "dateOfBirth",
      "address",
      "city",
      "country",
      "postalCode",
      "nationalId",
      "pronouns",
      "residencyStatus",
      // Emergency Contact
      "emergencyContactName",
      "emergencyContactPhone",
      "emergencyContactRelationship",
      // Employment Information
      "departmentName",
      "jobTitle",
      "employmentType",
      "contractType",
      "startDate",
      "contractEndDate",
      "siteLocation",
      // Compensation
      "salary",
      "hourlyRate",
      "workingPatternName",
      // Banking & Tax
      "bankAccountNumber",
      "irdNumber",
      "taxCode",
      // KiwiSaver
      "kiwiSaverEnrolled",
      "kiwiSaverContribution",
      // Management
      "managerEmail",
    ];

    const sampleData = [
      [
        "John",
        "Doe",
        "john.doe@company.com",
        "+1-555-0123",
        "1990-01-15",
        "123 Main St",
        "New York",
        "USA",
        "10001",
        "123456789",
        "he/him",
        "Citizen",
        "Jane Doe",
        "+1-555-0124",
        "Spouse",
        departments[0]?.name || "Engineering",
        jobRoles[0]?.name || "Software Engineer",
        "FULL_TIME",
        "PERMANENT",
        "2024-01-01",
        "2025-12-31",
        "Auckland Office",
        "75000",
        "45.00",
        workingPatterns[0]?.name || "Standard",
        "1234567890",
        "123456789",
        "M",
        "true",
        "3",
        "manager@company.com",
      ],
      [
        "Jane",
        "Smith",
        "jane.smith@company.com",
        "+1-555-0125",
        "1985-05-20",
        "456 Oak Ave",
        "San Francisco",
        "USA",
        "94102",
        "987654321",
        "she/her",
        "Permanent Resident",
        "John Smith",
        "+1-555-0126",
        "Spouse",
        departments[1]?.name || "Marketing",
        jobRoles[1]?.name || "Marketing Manager",
        "FULL_TIME",
        "PERMANENT",
        "2024-01-01",
        "",
        "Wellington Office",
        "85000",
        "",
        workingPatterns[1]?.name || "Flexible",
        "0987654321",
        "987654321",
        "S",
        "false",
        "",
        "director@company.com",
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
