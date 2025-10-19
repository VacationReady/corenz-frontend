import { cookies, headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import JSZip from "jszip";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get sample data for templates
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

    // Create ZIP file
    const zip = new JSZip();

    // 1. Departments CSV
    const departmentHeaders = [
      "name",
      "description",
      "headEmail",
      "code",
      "active",
    ];

    const departmentSampleData = [
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

    const departmentCsvContent = [
      departmentHeaders.join(","),
      ...departmentSampleData.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    zip.file("01_departments_template.csv", departmentCsvContent);

    // 2. Job Roles CSV
    const jobRoleHeaders = [
      "name",
      "description",
      "departmentName",
      "level",
      "payGrade",
      "active",
    ];

    const jobRoleSampleData = [
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

    const jobRoleCsvContent = [
      jobRoleHeaders.join(","),
      ...jobRoleSampleData.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    zip.file("02_job_roles_template.csv", jobRoleCsvContent);

    // 3. Working Patterns CSV
    const workingPatternHeaders = [
      "name",
      "description",
      "patternType",
      "mondayHours",
      "tuesdayHours",
      "wednesdayHours",
      "thursdayHours",
      "fridayHours",
      "saturdayHours",
      "sundayHours",
      "active",
    ];

    const workingPatternSampleData = [
      [
        "Standard Full Time",
        "Monday to Friday, 8 hours per day",
        "STANDARD",
        "8",
        "8",
        "8",
        "8",
        "8",
        "0",
        "0",
        "true",
      ],
      [
        "Part Time",
        "Monday to Friday, 4 hours per day",
        "PART_TIME",
        "4",
        "4",
        "4",
        "4",
        "4",
        "0",
        "0",
        "true",
      ],
      [
        "Shift Work",
        "Rotating shifts including weekends",
        "SHIFT",
        "8",
        "8",
        "0",
        "0",
        "8",
        "8",
        "8",
        "true",
      ],
    ];

    const workingPatternCsvContent = [
      workingPatternHeaders.join(","),
      ...workingPatternSampleData.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    zip.file("03_working_patterns_template.csv", workingPatternCsvContent);

    // 4. Employees CSV
    const employeeHeaders = [
      "firstName",
      "lastName",
      "email",
      "phoneNumber",
      "dateOfBirth",
      "gender",
      "street",
      "city",
      "postcode",
      "country",
      "nationalId",
      "pronouns",
      "residencyStatus",
      "holidayTotalBalance",
      "holidayCarryover",
      "holidayCurrentBalance",
      "holidayYear",
      "departmentName",
      "jobRoleName",
      "employmentType",
      "contractType",
      "siteLocation",
      "startDate",
      "contractEndDate",
      "workingPatternName",
      "managerEmail",
      "lineManagerName",
      "salaryAmount",
      "hourlyRate",
      "bankAccountNumber",
      "irdNumber",
      "taxCode",
      "kiwiSaverEnrolled",
      "kiwiSaverContribution",
      "emergencyContactName",
      "emergencyContactRelationship",
      "emergencyContactPhone",
      "emergencyContactEmail",
      "driverLicenceType",
      "driverLicenceNumber",
      "driverLicenceIssueDate",
      "driverLicenceExpiryDate",
      "trainingCourse",
      "trainingProvider",
      "trainingDateCompleted",
      "trainingExpiryDate",
      "employmentCheckType",
      "employmentCheckDocumentNumber",
      "employmentCheckIssueDate",
      "employmentCheckExpiryDate",
    ];

    const employeeSampleData = [
      [
        "John",
        "Doe",
        "john.doe@company.com",
        "+64 21 555 0101",
        "1990-01-15",
        "Male",
        "123 Main St",
        "Auckland",
        "1010",
        "New Zealand",
        "ABC123456",
        "he/him",
        "Citizen",
        "25",
        "3",
        "18",
        "2024",
        departments[0]?.name || "Engineering",
        jobRoles[0]?.name || "Software Engineer",
        "Full Time",
        "Permanent",
        "Auckland HQ",
        "2024-01-08",
        "",
        workingPatterns[0]?.name || "Standard 40hr",
        "engineering.lead@company.com",
        "Amelia Clark",
        "85000",
        "",
        "12-1234-1234567-00",
        "123-456-789",
        "M",
        "Yes",
        "3",
        "Jane Doe",
        "Spouse",
        "+64 21 555 0102",
        "jane.doe@example.com",
        "Full",
        "DL123456",
        "2022-02-10",
        "2032-02-09",
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
        "Jane",
        "Smith",
        "jane.smith@company.com",
        "+64 21 555 0202",
        "1985-05-20",
        "Female",
        "456 Harbour View Rd",
        "Wellington",
        "6011",
        "New Zealand",
        "XYZ987654",
        "she/her",
        "Permanent Resident",
        "30",
        "5",
        "22",
        "2024",
        departments[1]?.name || "Marketing",
        jobRoles[1]?.name || "Marketing Manager",
        "Full Time",
        "Fixed Term",
        "Wellington Hub",
        "2023-09-01",
        "2025-08-31",
        workingPatterns[1]?.name || "Hybrid 32hr",
        "marketing.director@company.com",
        "Liam Johnson",
        "92000",
        "",
        "98-7654-0987654-00",
        "987-654-321",
        "ME SL",
        "No",
        "",
        "John Smith",
        "Partner",
        "+64 21 555 0203",
        "john.smith@example.com",
        "Restricted",
        "DL654321",
        "2021-07-01",
        "2026-07-01",
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

    const employeeCsvContent = [
      employeeHeaders.join(","),
      ...employeeSampleData.map((row) =>
        row.map((cell) => `"${cell}"`).join(",")
      ),
    ].join("\n");

    zip.file("04_employees_template.csv", employeeCsvContent);

    // 5. Payroll CSV (fetch from existing endpoint to keep logic in sync)
    const cookieHeader = cookies().toString();
    const incomingHeaders = await headers();
    const protocol = incomingHeaders.get("x-forwarded-proto") ?? "https";
    const host = incomingHeaders.get("host");

    const payrollResponse = await fetch(`${protocol}://${host}/api/csv-import/payroll`, {
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (payrollResponse.ok) {
      const payrollCsv = await payrollResponse.text();
      zip.file("05_payroll_template.csv", payrollCsv);
    }

    // 6. Training CSV
    const trainingResponse = await fetch(`${protocol}://${host}/api/csv-import/training`, {
      headers: {
        Cookie: cookieHeader,
      },
    });

    if (trainingResponse.ok) {
      const trainingCsv = await trainingResponse.text();
      zip.file("06_training_template.csv", trainingCsv);
    }

    // 5. Import Instructions README
    const readmeContent = `# CSV Import Templates

This ZIP file contains all the CSV templates needed to import your HR data.

## Import Order (IMPORTANT!)

Please import the files in this exact order:

1. **01_departments_template.csv** - Departments (no dependencies)
2. **02_job_roles_template.csv** - Job roles (requires departments)
3. **03_working_patterns_template.csv** - Working patterns (no dependencies)
4. **04_employees_template.csv** - Employees (requires departments, job roles, and working patterns)
5. **05_payroll_template.csv** - Payroll (requires employees)
6. **06_training_template.csv** - Training & employment checks (requires employees)

## Field Requirements

### Departments
- **Required**: name
- **Optional**: description, headEmail, code, active

### Job Roles
- **Required**: name, departmentName
- **Optional**: description, level, payGrade, active

### Working Patterns
- **Required**: name
- **Optional**: description, patternType, mondayHours-sundayHours, active

### Employees
- **Required**: firstName, lastName, email (keep these as the first columns)
- **Recommended**: departmentName, jobRoleName, workingPatternName, employmentType, contractType, startDate, managerEmail and/or lineManagerName
- **Optional**: Holiday balances, payroll & bank data, KiwiSaver settings, emergency contacts, driver licence, training, employment checks
- **Formatting**:
  - Dates must use YYYY-MM-DD
  - Tax codes follow NZ IRD format (e.g. M, ME SL, S)
  - KiwiSaver enrolled accepts Yes/No, True/False, or 1/0
  - Numeric fields can include decimals (e.g. 37.5 for hours)

## Tips

1. Fill in the sample data with your actual information
2. Remove rows you don't need
3. Ensure department names match exactly between files
4. Ensure job role names match exactly between files
5. Ensure working pattern names match exactly between files
6. Use consistent email formats
7. Date format should be YYYY-MM-DD
8. Boolean values can be Yes/No, True/False, or 1/0

## Validation

The system will validate your data and show specific errors for any issues. Common issues include:
- Missing required fields
- Invalid email formats
- References to non-existent departments/job roles/working patterns
- Invalid date formats
- Invalid boolean values

## Support

If you encounter any issues, please check the error messages in the import results and fix the specific rows mentioned.
`;

    zip.file("README.txt", readmeContent);

    // Generate ZIP file
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Return ZIP file
    return new NextResponse(zipBuffer as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition":
          "attachment; filename=csv_import_templates.zip",
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("Download all templates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
