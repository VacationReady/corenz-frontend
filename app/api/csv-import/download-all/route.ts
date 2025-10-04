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
      ...departmentSampleData.map(row => row.map(cell => `"${cell}"`).join(",")),
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
      ...jobRoleSampleData.map(row => row.map(cell => `"${cell}"`).join(",")),
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
      ...workingPatternSampleData.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    zip.file("03_working_patterns_template.csv", workingPatternCsvContent);

    // 4. Employees CSV
    const employeeHeaders = [
      "firstName",
      "lastName", 
      "email",
      "phoneNumber",
      "dateOfBirth",
      "address",
      "city",
      "country",
      "postalCode",
      "emergencyContactName",
      "emergencyContactPhone",
      "emergencyContactRelationship",
      "bankAccountNumber",
      "departmentName",
      "jobTitle",
      "employmentType",
      "contractType",
      "startDate",
      "salary",
      "workingPatternName",
      "managerEmail",
    ];

    const employeeSampleData = [
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
        "Jane Doe",
        "+1-555-0124",
        "Spouse",
        "1234567890",
        departments[0]?.name || "Engineering",
        jobRoles[0]?.name || "Software Engineer",
        "FULL_TIME",
        "PERMANENT",
        "2024-01-01",
        "75000",
        workingPatterns[0]?.name || "Standard Full Time",
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
        "John Smith",
        "+1-555-0126",
        "Spouse",
        "0987654321",
        departments[1]?.name || "Marketing",
        jobRoles[1]?.name || "Marketing Manager",
        "FULL_TIME",
        "PERMANENT",
        "2024-01-15",
        "85000",
        workingPatterns[0]?.name || "Standard Full Time",
        "director@company.com",
      ],
    ];

    const employeeCsvContent = [
      employeeHeaders.join(","),
      ...employeeSampleData.map(row => row.map(cell => `"${cell}"`).join(",")),
    ].join("\n");

    zip.file("04_employees_template.csv", employeeCsvContent);

    // 5. Import Instructions README
    const readmeContent = `# CSV Import Templates

This ZIP file contains all the CSV templates needed to import your HR data.

## Import Order (IMPORTANT!)

Please import the files in this exact order:

1. **01_departments_template.csv** - Departments (no dependencies)
2. **02_job_roles_template.csv** - Job roles (requires departments)
3. **03_working_patterns_template.csv** - Working patterns (no dependencies)
4. **04_employees_template.csv** - Employees (requires departments, job roles, and working patterns)

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
- **Required**: firstName, lastName, email
- **Optional**: All other fields

## Tips

1. Fill in the sample data with your actual information
2. Remove rows you don't need
3. Ensure department names match exactly between files
4. Ensure job role names match exactly between files
5. Ensure working pattern names match exactly between files
6. Use consistent email formats
7. Date format should be YYYY-MM-DD
8. Boolean values should be "true" or "false"

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
        "Content-Disposition": "attachment; filename=csv_import_templates.zip",
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
