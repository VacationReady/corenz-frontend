import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import { auditLog } from "@/lib/audit";
import { Prisma, Role } from "@prisma/client";
import { employeeDomainConfig } from "@/lib/csv-import/domains/employees";

const EMPLOYEE_TEMPLATE_HEADERS = [
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
  "emergencyContactName",
  "emergencyContactRelationship",
  "emergencyContactPhone",
  "emergencyContactEmail",
  "employmentCheckType",
  "employmentCheckDocumentNumber",
  "employmentCheckIssueDate",
  "employmentCheckExpiryDate",
  "driverLicenceType",
  "driverLicenceNumber",
  "driverLicenceIssueDate",
  "driverLicenceExpiryDate",
] as const;

const BASE_TEMPLATE_HEADERS: string[] = ["firstName", "lastName", "email"];

const EMPLOYEE_SUB_TEMPLATE_FIELD_MAP: Record<string, string[]> = {
  core: [
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
    "emergencyContactName",
    "emergencyContactRelationship",
    "emergencyContactPhone",
    "emergencyContactEmail",
  ],
  employment: [
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
    "holidayTotalBalance",
    "holidayCarryover",
    "holidayCurrentBalance",
    "holidayYear",
    "employmentCheckType",
    "employmentCheckDocumentNumber",
    "employmentCheckIssueDate",
    "employmentCheckExpiryDate",
  ],
  compliance: [
    "driverLicenceType",
    "driverLicenceNumber",
    "driverLicenceIssueDate",
    "driverLicenceExpiryDate",
    "employmentCheckType",
    "employmentCheckDocumentNumber",
    "employmentCheckIssueDate",
    "employmentCheckExpiryDate",
  ],
};

const EMPLOYEE_SUB_TEMPLATE_IDS = new Set(
  (employeeDomainConfig.subTemplates ?? []).map(subTemplate => subTemplate.id),
);

const parseSubTemplateScope = (value: unknown): string[] | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const queue: unknown[] = Array.isArray(value) ? [...value] : [value];
  const rawEntries: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (current === null || current === undefined) {
      continue;
    }

    if (Array.isArray(current)) {
      queue.push(...current);
      continue;
    }

    // Ignore file/blob inputs from FormData
    if (typeof File !== "undefined" && current instanceof File) {
      continue;
    }

    if (typeof current === "string") {
      const trimmed = current.trim();
      if (!trimmed) {
        continue;
      }

      // Attempt to parse JSON arrays (e.g. '["core","payroll"]')
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) {
            queue.push(...parsed);
            continue;
          }
        } catch (error) {
          // Fall back to treating the value as a comma-delimited string
        }
      }

      rawEntries.push(trimmed);
      continue;
    }

    if (typeof current === "object") {
      // Handle URLSearchParams-style objects that expose toString()
      if (typeof (current as { toString?: () => string }).toString === "function") {
        const stringified = (current as { toString: () => string }).toString();
        if (stringified) {
          queue.push(stringified);
        }
      }
    }
  }

  const tokens = rawEntries
    .flatMap(entry => entry.split(","))
    .map(token => token.trim())
    .filter(token => token.length > 0);

  if (tokens.length === 0) {
    return null;
  }

  const seen = new Set<string>();
  const scope: string[] = [];

  for (const token of tokens) {
    if (!EMPLOYEE_SUB_TEMPLATE_IDS.has(token) || seen.has(token)) {
      continue;
    }

    seen.add(token);
    scope.push(token);
  }

  return scope.length > 0 ? scope : null;
};

const filterHeadersByScope = (scope: string[] | null): string[] => {
  if (!scope || scope.length === 0) {
    return [...EMPLOYEE_TEMPLATE_HEADERS];
  }

  const allowed = new Set<string>(BASE_TEMPLATE_HEADERS);
  scope.forEach(subTemplateId => {
    const fields = EMPLOYEE_SUB_TEMPLATE_FIELD_MAP[subTemplateId];
    if (fields) {
      fields.forEach(field => allowed.add(field));
    }
  });

  return EMPLOYEE_TEMPLATE_HEADERS.filter(header => allowed.has(header));
};

const validateHeaders = (headers: string[], scope: string[] | null): boolean => {
  if (!scope || scope.length === 0) {
    return true;
  }

  const expected = new Set(filterHeadersByScope(scope));
  const headerSet = new Set(headers.map(header => header.trim()));

  // All expected headers must be present, but allow additional columns for forward compatibility
  for (const expectedHeader of expected) {
    if (!headerSet.has(expectedHeader)) {
      return false;
    }
  }

  return true;
};

const filterSampleRow = (
  row: Record<string, string | undefined>,
  headers: string[],
): Record<string, string> => {
  const filtered: Record<string, string> = {};
  headers.forEach(header => {
    filtered[header] = row[header] ?? "";
  });
  return filtered;
};

const extractScopeFromRequest = (request: NextRequest): string[] | null => {
  const searchParams = request.nextUrl.searchParams;
  const searchValues: Array<string | null> = [
    ...searchParams.getAll("subTemplates"),
    ...searchParams.getAll("subTemplates[]"),
    searchParams.get("scope"),
  ];

  return parseSubTemplateScope(searchValues.filter(value => value !== null));
};

const extractScopeFromBodyOrQuery = (
  request: NextRequest,
  source: FormData,
): string[] | null => {
  const formValues: FormDataEntryValue[] = [
    ...source.getAll("subTemplates"),
    ...source.getAll("subTemplates[]"),
  ];

  const scopeFromForm = parseSubTemplateScope(formValues);
  if (scopeFromForm) {
    return scopeFromForm;
  }

  const scopeField = source.get("scope");
  if (scopeField) {
    const scope = parseSubTemplateScope(scopeField);
    if (scope) {
      return scope;
    }
  }

  return extractScopeFromRequest(request);
};

const EMPLOYEE_SAMPLE_ROWS: Array<Record<string, string>> = [
  {
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@company.com",
    phoneNumber: "+64 21 555 0101",
    dateOfBirth: "1990-01-15",
    gender: "Male",
    street: "123 Main St",
    city: "Auckland",
    postcode: "1010",
    country: "New Zealand",
    nationalId: "ABC123456",
    pronouns: "he/him",
    residencyStatus: "Citizen",
    holidayTotalBalance: "25",
    holidayCarryover: "3",
    holidayCurrentBalance: "18",
    holidayYear: "2024",
    departmentName: "Engineering",
    jobRoleName: "Software Engineer",
    employmentType: "Full Time",
    contractType: "Permanent",
    siteLocation: "Auckland HQ",
    startDate: "2024-01-08",
    contractEndDate: "",
    workingPatternName: "Standard 40hr",
    managerEmail: "engineering.lead@company.com",
    lineManagerName: "Amelia Clark",
    emergencyContactName: "Jane Doe",
    emergencyContactRelationship: "Spouse",
    emergencyContactPhone: "+64 21 555 0102",
    emergencyContactEmail: "jane.doe@example.com",
    employmentCheckType: "Passport",
    employmentCheckDocumentNumber: "P123456789",
    employmentCheckIssueDate: "2022-02-10",
    employmentCheckExpiryDate: "2032-02-09",
    driverLicenceType: "Full",
    driverLicenceNumber: "DL123456",
    driverLicenceIssueDate: "2022-02-10",
    driverLicenceExpiryDate: "2032-02-09",
  },
  {
    firstName: "Jane",
    lastName: "Smith",
    email: "jane.smith@company.com",
    phoneNumber: "+64 21 555 0202",
    dateOfBirth: "1985-05-20",
    gender: "Female",
    street: "456 Harbour View Rd",
    city: "Wellington",
    postcode: "6011",
    country: "New Zealand",
    nationalId: "XYZ987654",
    pronouns: "she/her",
    residencyStatus: "Permanent Resident",
    holidayTotalBalance: "30",
    holidayCarryover: "5",
    holidayCurrentBalance: "22",
    holidayYear: "2024",
    departmentName: "Marketing",
    jobRoleName: "Marketing Manager",
    employmentType: "Full Time",
    contractType: "Fixed Term",
    siteLocation: "Wellington Hub",
    startDate: "2023-09-01",
    contractEndDate: "2025-08-31",
    workingPatternName: "Hybrid 32hr",
    managerEmail: "marketing.director@company.com",
    lineManagerName: "Liam Johnson",
    emergencyContactName: "John Smith",
    emergencyContactRelationship: "Partner",
    emergencyContactPhone: "+64 21 555 0203",
    emergencyContactEmail: "john.smith@example.com",
    employmentCheckType: "Visa",
    employmentCheckDocumentNumber: "V987654321",
    employmentCheckIssueDate: "2021-03-01",
    employmentCheckExpiryDate: "2024-03-01",
    driverLicenceType: "Restricted",
    driverLicenceNumber: "DL654321",
    driverLicenceIssueDate: "2021-07-01",
    driverLicenceExpiryDate: "2026-07-01",
  },
];

const employeeImportSchema = z.object({
  // Personal information
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phoneNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  street: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  nationalId: z.string().optional(),
  pronouns: z.string().optional(),
  residencyStatus: z.string().optional(),

  // Holiday & leave
  holidayTotalBalance: z.string().optional(),
  holidayCarryover: z.string().optional(),
  holidayCurrentBalance: z.string().optional(),
  holidayYear: z.string().optional(),

  // Employment details
  departmentName: z.string().optional(),
  jobRoleName: z.string().optional(),
  jobTitle: z.string().optional(),
  employmentType: z.string().optional(),
  contractType: z.string().optional(),
  siteLocation: z.string().optional(),
  startDate: z.string().optional(),
  contractEndDate: z.string().optional(),
  workingPatternName: z.string().optional(),
  managerEmail: z.string().optional(),
  lineManagerName: z.string().optional(),
  lineManager: z.string().optional(),
  employmentCheckType: z.string().optional(),
  employmentCheckDocumentNumber: z.string().optional(),
  employmentCheckIssueDate: z.string().optional(),
  employmentCheckExpiryDate: z.string().optional(),

  // Emergency contacts
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactEmail: z.string().optional(),

  // Driver licence
  driverLicenceType: z.string().optional(),
  driverLicenceNumber: z.string().optional(),
  driverLicenceIssueDate: z.string().optional(),
  driverLicenceExpiryDate: z.string().optional(),
});

type EmployeeImportData = z.infer<typeof employeeImportSchema>;

const trimToUndefined = (value?: string | null): string | undefined => {
  if (value === undefined || value === null) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const parseOptionalNumber = (value: string | undefined, label: string): number | undefined => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const normalised = trimmed.replace(/,/g, "");
  const parsed = Number(normalised);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label} "${trimmed}". Please provide a numeric value.`);
  }
  return parsed;
};

const parseOptionalDate = (value: string | undefined, label: string): Date | undefined => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label} "${trimmed}". Use YYYY-MM-DD format.`);
  }
  return parsed;
};

const normaliseEmploymentType = (value: string | undefined): string | undefined => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const mapped = trimmed.replace(/[\s-]+/g, "_").toUpperCase();
  const allowed = new Set(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN", "TEMPORARY"]);
  if (!allowed.has(mapped)) {
    throw new Error(
      `Invalid employmentType "${trimmed}". Accepted values: Full Time, Part Time, Contract, Intern, Temporary.`
    );
  }
  return mapped;
};

const normaliseContractType = (value: string | undefined): string | undefined => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const mapped = trimmed.replace(/[\s-]+/g, "_").toUpperCase();
  const allowed = new Set(["PERMANENT", "FIXED_TERM", "PROBATIONARY", "CONSULTANT"]);
  if (!allowed.has(mapped)) {
    throw new Error(
      `Invalid contractType "${trimmed}". Accepted values: Permanent, Fixed Term, Probationary, Consultant.`
    );
  }
  return mapped;
};

const promoteManagerIfNeeded = async (
  managerUserId: string,
  companyId: string,
) => {
  try {
    const managerUser = await prisma.user.findFirst({
      where: { id: managerUserId, companyId },
      select: { id: true, role: true },
    });

    if (!managerUser) {
      return;
    }

    if (
      managerUser.role === Role.ADMIN ||
      managerUser.role === Role.MANAGER ||
      managerUser.role === Role.SUPER_ADMIN
    ) {
      return;
    }

    if (managerUser.role === Role.EMPLOYEE) {
      const managerProfile = await prisma.permissionProfile.findFirst({
        where: {
          companyId,
          name: { equals: "Manager", mode: "insensitive" },
        },
        select: { id: true },
      });

      await prisma.user.update({
        where: { id: managerUserId },
        data: {
          role: Role.MANAGER,
          ...(managerProfile ? { permissionProfileId: managerProfile.id } : {}),
        },
      });
    }
  } catch (error) {
    console.warn(
      `Failed to auto-promote manager role for ${managerUserId}:`,
      error,
    );
  }
};

const parseBooleanFlag = (value: unknown): boolean | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalised)) return true;
    if (["false", "0", "no", "off"].includes(normalised)) return false;
  }
  return undefined;
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    // Robustly support both form field and query param for allowUpdates
    const allowUpdates =
      parseBooleanFlag(formData.get("allowUpdates")) ??
      parseBooleanFlag(request.nextUrl.searchParams.get("allowUpdates")) ??
      false;

    const subTemplateScope = extractScopeFromBodyOrQuery(request, formData);

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

    if (!validateHeaders(Object.keys(records[0] ?? {}), subTemplateScope)) {
      return NextResponse.json(
        {
          error:
            "The uploaded CSV does not match the selected template scope. Please download a fresh template and try again.",
        },
        { status: 400 },
      );
    }

    const results = {
      total: records.length,
      successful: 0,
      failed: 0,
      errors: [] as Array<{ row: number; errors: string[] }>,
      created: [] as Array<{ id: string; email: string; name: string }>,
      updated: [] as Array<{ id: string; email: string; name: string }>,
    };

    const importBatchId = `csv_import_${Date.now()}`;
    
    // Track manager relationships for second pass processing
    const managerRelationships: Array<{
      userId: string;
      email: string;
      managerEmail?: string;
      lineManagerName?: string;
      rowNumber: number;
      managerUserId?: string;
    }> = [];

    // Pre-load reference data to avoid repeated database queries
    console.log("Pre-loading reference data...");
    const [departments, jobRoles, workingPatterns, genderOptions, existingUsers, locations] = await Promise.all([
      prisma.department.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true, name: true },
      }),
      prisma.jobRole.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true, name: true },
      }),
      prisma.workingPattern.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true, name: true },
      }),
      prisma.genderOption.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true, label: true },
      }),
      prisma.user.findMany({
        where: { companyId: session.user.companyId },
        select: { id: true, email: true, firstName: true, lastName: true, name: true },
      }),
      prisma.location.findMany({
        where: { OR: [{ companyId: session.user.companyId }, { companyId: null }] },
        select: { id: true, name: true },
      }),
    ]);

    // Create lookup maps for faster access
    const departmentMap = new Map(departments.map(d => [d.name.toLowerCase(), d]));
    const jobRoleMap = new Map(jobRoles.map(jr => [jr.name.toLowerCase(), jr]));
    const workingPatternMap = new Map(workingPatterns.map(wp => [wp.name.toLowerCase(), wp]));
    const genderOptionMap = new Map(genderOptions.map(go => [go.label.toLowerCase(), go]));
    const userEmailMap = new Map(existingUsers.map(u => [u.email.toLowerCase(), u]));
    const locationMap = new Map(
      locations
        .filter((location) => location.name)
        .map((location) => [location.name.toLowerCase(), location] as const),
    );

    // Process records in batches to avoid timeouts
    const BATCH_SIZE = 25; // Reduced batch size for better performance
    const batches = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE));
    }

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} records)`);

      for (let i = 0; i < batch.length; i++) {
        const record = batch[i];
        const rowNumber = (batchIndex * BATCH_SIZE) + i + 2; // +2 because CSV headers are row 1, data starts at row 2

        try {
          // Validate the record
          const validatedData = employeeImportSchema.parse(record);

        const email = validatedData.email.trim().toLowerCase();
        const firstName = validatedData.firstName.trim();
        const lastName = validatedData.lastName.trim();

        // Check if user already exists
        const existingUser = userEmailMap.get(email);
        let existingUserWithEmployee = null;
        if (existingUser) {
          existingUserWithEmployee = await prisma.user.findFirst({
            where: { id: existingUser.id },
            include: { Employee: true },
          });
        }

        if (existingUserWithEmployee && !allowUpdates) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            errors: [
              `User with email ${validatedData.email} already exists. Enable "Allow updates for existing employees" to merge changes.`,
            ],
          });
          continue;
        }

        const canUpdateExistingUser = Boolean(existingUser && allowUpdates);

        const phoneNumber = trimToUndefined(validatedData.phoneNumber);
        const dateOfBirthValue = parseOptionalDate(validatedData.dateOfBirth, "dateOfBirth");
        const dateOfBirth = dateOfBirthValue ?? null;
        const gender = trimToUndefined(validatedData.gender);
        const street = trimToUndefined(validatedData.street) ?? trimToUndefined(validatedData.address);
        const city = trimToUndefined(validatedData.city);
        const postcode = trimToUndefined(validatedData.postcode) ?? trimToUndefined(validatedData.postalCode);
        const country = trimToUndefined(validatedData.country);
        const nationalId = trimToUndefined(validatedData.nationalId);
        const pronouns = trimToUndefined(validatedData.pronouns);
        const residencyStatus = trimToUndefined(validatedData.residencyStatus);
        const emergencyContactName = trimToUndefined(validatedData.emergencyContactName);
        const emergencyContactRelationship = trimToUndefined(validatedData.emergencyContactRelationship);
        const emergencyContactPhone = trimToUndefined(validatedData.emergencyContactPhone);
        const emergencyContactEmail = trimToUndefined(validatedData.emergencyContactEmail);
        if (emergencyContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emergencyContactEmail)) {
          throw new Error(`Invalid emergencyContactEmail "${emergencyContactEmail}". Provide a valid email.`);
        }

        const holidayTotalBalance = parseOptionalNumber(validatedData.holidayTotalBalance, "holidayTotalBalance");
        const holidayCarryover = parseOptionalNumber(validatedData.holidayCarryover, "holidayCarryover");
        const holidayCurrentBalance = parseOptionalNumber(
          validatedData.holidayCurrentBalance,
          "holidayCurrentBalance"
        );
        const holidayYearInput = trimToUndefined(validatedData.holidayYear);
        let holidayYear: number | undefined;
        let holidayCarryoverExpiry: Date | undefined;
        if (holidayYearInput) {
          const parsedYear = Number.parseInt(holidayYearInput, 10);
          if (!Number.isFinite(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
            throw new Error(
              `Invalid holidayYear "${holidayYearInput}". Please provide a four-digit year (e.g. 2025).`
            );
          }
          holidayYear = parsedYear;
          holidayCarryoverExpiry = new Date(parsedYear, 11, 31);
        }

        const siteLocation = trimToUndefined(validatedData.siteLocation);
        let location = siteLocation
          ? locationMap.get(siteLocation.toLowerCase()) ?? null
          : null;

        if (siteLocation && !location) {
          const locationKey = siteLocation.toLowerCase();

          try {
            const createdLocation = await prisma.location.create({
              data: {
                id: crypto.randomUUID(),
                name: siteLocation,
                companyId: session.user.companyId,
              },
              select: { id: true, name: true },
            });

            location = createdLocation;
            locationMap.set(locationKey, createdLocation);
          } catch (error) {
            if (
              error instanceof Prisma.PrismaClientKnownRequestError &&
              error.code === "P2002"
            ) {
              const existingLocation = await prisma.location.findFirst({
                where: {
                  name: { equals: siteLocation, mode: "insensitive" },
                },
                select: { id: true, name: true },
              });

              if (existingLocation) {
                location = existingLocation;
                locationMap.set(locationKey, existingLocation);
              }
            } else {
              throw error;
            }
          }
        }

        const resolvedLocationId = location?.id;

        const startDate = parseOptionalDate(validatedData.startDate, "startDate");
        const contractEndDate = parseOptionalDate(validatedData.contractEndDate, "contractEndDate");
        const workingPatternName = trimToUndefined(validatedData.workingPatternName);

        const driverLicenceType = trimToUndefined(validatedData.driverLicenceType);
        const driverLicenceNumber = trimToUndefined(validatedData.driverLicenceNumber);
        const driverLicenceIssueDate = parseOptionalDate(
          validatedData.driverLicenceIssueDate,
          "driverLicenceIssueDate"
        );
        const driverLicenceExpiryDate = parseOptionalDate(
          validatedData.driverLicenceExpiryDate,
          "driverLicenceExpiryDate"
        );

        const employmentCheckType = trimToUndefined(validatedData.employmentCheckType);
        const employmentCheckDocumentNumber = trimToUndefined(validatedData.employmentCheckDocumentNumber);
        const employmentCheckIssueDate = parseOptionalDate(
          validatedData.employmentCheckIssueDate,
          "employmentCheckIssueDate"
        );
        const employmentCheckExpiryDate = parseOptionalDate(
          validatedData.employmentCheckExpiryDate,
          "employmentCheckExpiryDate"
        );

        const managerEmail = trimToUndefined(validatedData.managerEmail);
        const lineManagerName =
          trimToUndefined(validatedData.lineManagerName) ?? trimToUndefined(validatedData.lineManager);

        if (managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) {
          throw new Error(`Invalid managerEmail "${managerEmail}". Provide a valid email address.`);
        }

        const departmentName = trimToUndefined(validatedData.departmentName);
        const jobRoleName = trimToUndefined(validatedData.jobRoleName) ?? trimToUndefined(validatedData.jobTitle);
        const employmentType = normaliseEmploymentType(validatedData.employmentType);
        const contractType = normaliseContractType(validatedData.contractType);

        // Find department (must exist)
        let department = null;
        if (departmentName) {
          department = departmentMap.get(departmentName.toLowerCase());

          if (!department) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              errors: [`Department "${departmentName}" not found. Please import departments first.`],
            });
            continue;
          }
        }

        // Find job role (must exist)
        let jobRole = null;
        if (jobRoleName) {
          jobRole = jobRoleMap.get(jobRoleName.toLowerCase());

          if (!jobRole) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              errors: [`Job role "${jobRoleName}" not found. Please import job roles first.`],
            });
            continue;
          }
        }

        // Resolve manager: prefer managerEmail; fall back to lineManagerName
        let managerUser = null;
        const managerErrors: string[] = [];
        const lineManagerErrors: string[] = [];

        if (managerEmail) {
          managerUser = await prisma.user.findFirst({
            where: {
              companyId: session.user.companyId,
              email: managerEmail,
            },
          });

          if (!managerUser) {
            managerErrors.push(
              `Manager with email "${managerEmail}" not found. Import managers before their team members.`
            );
          }
        }

        if (!managerUser && lineManagerName) {
          const managerNameParts = lineManagerName.split(/\s+/).filter(Boolean);
          const nameSearchConditions: Prisma.UserWhereInput[] = [];

          if (managerNameParts.length >= 2) {
            const firstNamePart = managerNameParts[0];
            const lastNamePart = managerNameParts.slice(1).join(" ");
            nameSearchConditions.push({
              AND: [
                { firstName: { equals: firstNamePart, mode: "insensitive" } },
                { lastName: { equals: lastNamePart, mode: "insensitive" } },
              ],
            });
          }

          // exact full-name match on "name"
          nameSearchConditions.push({
            name: { equals: lineManagerName, mode: "insensitive" },
          });

          if (managerNameParts.length === 1) {
            const [singleName] = managerNameParts;
            nameSearchConditions.push({ firstName: { equals: singleName, mode: "insensitive" } });
            nameSearchConditions.push({ lastName: { equals: singleName, mode: "insensitive" } });
          }

          const matchingManagers = await prisma.user.findMany({
            where: {
              companyId: session.user.companyId,
              OR: nameSearchConditions,
            },
            take: 2,
          });

          if (matchingManagers.length === 1) {
            managerUser = matchingManagers[0];
          } else if (matchingManagers.length > 1) {
            lineManagerErrors.push(
              `Multiple managers match the name "${lineManagerName}". Provide managerEmail to import this employee.`
            );
          } else {
            lineManagerErrors.push(
              `Line manager "${lineManagerName}" not found. Import managers before their team members.`
            );
          }
        }

        // Store manager info for later processing (don't fail import if manager not found)
        const managerInfo = {
          managerEmail,
          lineManagerName,
          managerUser,
        };

        // Find working pattern (must exist if provided)
        let workingPattern = null;
        if (workingPatternName) {
          workingPattern = workingPatternMap.get(workingPatternName.toLowerCase());

          if (!workingPattern) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              errors: [`Working pattern "${workingPatternName}" not found. Please import working patterns first.`],
            });
            continue;
          }
        }

        // Handle gender option lookups
        let genderOptionId: string | undefined;
        if (gender) {
          const existingGender = genderOptionMap.get(gender.toLowerCase());

          if (existingGender) {
            genderOptionId = existingGender.id;
          } else {
            const genderKeyBase =
              gender
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_|_$/g, "") || "custom_gender";
            const genderOption = await prisma.genderOption.create({
              data: {
                id: crypto.randomUUID(),
                companyId: session.user.companyId,
                key: `${genderKeyBase}_${crypto.randomUUID().slice(0, 6)}`,
                label: gender,
                order: 0,
                active: true,
                updatedAt: new Date(),
              },
            });
            genderOptionId = genderOption.id;
          }
        }

        let user;
        let employee;
        let employeeAction: "CREATED" | "UPDATED" = "CREATED";

        if (canUpdateExistingUser && existingUserWithEmployee) {
          const userUpdateData: Record<string, unknown> = {
            firstName,
            lastName,
            updatedAt: new Date(),
          };

          if (phoneNumber !== undefined) userUpdateData.phone = phoneNumber;
          if (dateOfBirthValue !== undefined) userUpdateData.dateOfBirth = dateOfBirth;
          if (street !== undefined) userUpdateData.addressStreet = street;
          if (city !== undefined) userUpdateData.addressCity = city;
          if (postcode !== undefined) userUpdateData.addressPostcode = postcode;
          if (country !== undefined) userUpdateData.addressCountry = country;
          if (emergencyContactName !== undefined) userUpdateData.emergencyContactName = emergencyContactName;
          if (emergencyContactPhone !== undefined) userUpdateData.emergencyContactPhone = emergencyContactPhone;
          if (emergencyContactRelationship !== undefined) {
            userUpdateData.emergencyContactRelationship = emergencyContactRelationship;
          }
          if (nationalId !== undefined) userUpdateData.nationalId = nationalId;
          if (pronouns !== undefined) userUpdateData.pronouns = pronouns;
          if (residencyStatus !== undefined) userUpdateData.residencyStatus = residencyStatus;
          if (genderOptionId !== undefined) userUpdateData.genderOptionId = genderOptionId;

          user = await prisma.user.update({
            where: { id: existingUserWithEmployee.id },
            data: userUpdateData,
          });

          const employeeUpdateData: Record<string, unknown> = {};
          if (contractType !== undefined) employeeUpdateData.contractType = contractType;
          if (employmentType !== undefined) employeeUpdateData.employmentType = employmentType;
          if (startDate !== undefined) employeeUpdateData.startDate = startDate ?? null;
          if (contractEndDate !== undefined) employeeUpdateData.contractEndDate = contractEndDate ?? null;
          if (siteLocation !== undefined) employeeUpdateData.siteLocation = siteLocation;
          if (resolvedLocationId !== undefined) employeeUpdateData.locationId = resolvedLocationId;
          if (department) employeeUpdateData.departmentId = department.id;
          if (jobRole) employeeUpdateData.jobRoleId = jobRole.id;
          if (workingPattern) employeeUpdateData.workingPatternId = workingPattern.id;

          const employeeWasExisting = Boolean(existingUserWithEmployee.Employee);
          const upsertedEmployee = await prisma.employee.upsert({
            where: { userId: existingUserWithEmployee.id },
            update: employeeUpdateData,
            create: {
              id: crypto.randomUUID(),
              userId: existingUserWithEmployee.id,
              contractType,
              employmentType,
              startDate: startDate ?? null,
              contractEndDate: contractEndDate ?? null,
              siteLocation,
              departmentId: department?.id,
              jobRoleId: jobRole?.id,
              workingPatternId: workingPattern?.id,
              locationId: resolvedLocationId ?? null,
              companyId: session.user.companyId,
              isActive: true,
            },
          });

          employee = upsertedEmployee;
          employeeAction = employeeWasExisting ? "UPDATED" : "CREATED";
        } else {
          user = await prisma.user.create({
            data: {
              id: crypto.randomUUID(),
              email,
              password: "temp-password", // Will need to be reset
              firstName,
              lastName,
              phone: phoneNumber,
              dateOfBirth,
              addressStreet: street,
              addressCity: city,
              addressPostcode: postcode,
              addressCountry: country,
              emergencyContactName,
              emergencyContactPhone,
              emergencyContactRelationship,
              nationalId,
              pronouns,
              residencyStatus,
              genderOptionId,
              companyId: session.user.companyId,
              isActivated: false, // Will need to activate
              updatedAt: new Date(),
            },
          });

          // Skip manager assignment during initial import - will be handled in second pass

          employee = await prisma.employee.create({
            data: {
              id: crypto.randomUUID(),
              userId: user.id,
              contractType,
              employmentType,
              startDate: startDate ?? null,
              contractEndDate: contractEndDate ?? null,
              siteLocation,
              departmentId: department?.id,
              jobRoleId: jobRole?.id,
              workingPatternId: workingPattern?.id,
              locationId: resolvedLocationId ?? null,
              companyId: session.user.companyId,
              isActive: true,
            },
          });
        }

        if (holidayTotalBalance !== undefined || holidayCarryover !== undefined || holidayCurrentBalance !== undefined) {
          let annualCategory = await prisma.eventCategory.findFirst({
            where: {
              companyId: session.user.companyId,
              name: { equals: "Annual Leave", mode: "insensitive" },
            },
          });

          if (!annualCategory) {
            annualCategory = await prisma.eventCategory.create({
              data: {
                id: crypto.randomUUID(),
                companyId: session.user.companyId,
                name: "Annual Leave",
                requiresApproval: true,
                adminOnly: false,
                isActive: true,
                categoryType: "TIME_OFF",
                color: "#008000",
                systemDefined: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            });
          }

          const totalDays = holidayTotalBalance ?? holidayCurrentBalance ?? 0;
          const usedDays =
            holidayTotalBalance !== undefined && holidayCurrentBalance !== undefined
              ? Math.max(holidayTotalBalance - holidayCurrentBalance, 0)
              : 0;

          await prisma.leaveEntitlement.upsert({
            where: {
              employeeId_eventCategoryId: {
                employeeId: employee.id,
                eventCategoryId: annualCategory.id,
              },
            },
            update: {
              totalDays,
              usedDays,
              carryoverDays: holidayCarryover ?? 0,
              daysAllocated: totalDays,
              carryoverExpiry: holidayCarryoverExpiry ?? null,
              updatedAt: new Date(),
            },
            create: {
              id: crypto.randomUUID(),
              employeeId: employee.id,
              companyId: session.user.companyId,
              eventCategoryId: annualCategory.id,
              totalDays,
              usedDays,
              carryoverDays: holidayCarryover ?? 0,
              daysAllocated: totalDays,
              carryoverExpiry: holidayCarryoverExpiry ?? null,
              updatedAt: new Date(),
            },
          });
        }

        if (
          emergencyContactName !== undefined ||
          emergencyContactRelationship !== undefined ||
          emergencyContactPhone !== undefined ||
          emergencyContactEmail !== undefined
        ) {
          const existingContact = await prisma.emergencyContact.findFirst({
            where: { employeeId: employee.id },
          });

          if (existingContact) {
            await prisma.emergencyContact.update({
              where: { id: existingContact.id },
              data: {
                name: emergencyContactName ?? existingContact.name,
                relationship: emergencyContactRelationship ?? existingContact.relationship,
                phone: emergencyContactPhone ?? existingContact.phone,
                email: emergencyContactEmail ?? existingContact.email,
              },
            });
          } else if (emergencyContactName) {
            await prisma.emergencyContact.create({
              data: {
                id: crypto.randomUUID(),
                employeeId: employee.id,
                name: emergencyContactName,
                relationship: emergencyContactRelationship ?? null,
                phone: emergencyContactPhone ?? null,
                email: emergencyContactEmail ?? null,
              },
            });
          }
        }

        if (
          employmentCheckType !== undefined ||
          employmentCheckDocumentNumber !== undefined ||
          employmentCheckIssueDate !== undefined ||
          employmentCheckExpiryDate !== undefined
        ) {
          if (
            !employmentCheckType ||
            !employmentCheckDocumentNumber ||
            !employmentCheckIssueDate ||
            !employmentCheckExpiryDate
          ) {
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
                dateOfIssue: employmentCheckIssueDate,
                expiryDate: employmentCheckExpiryDate,
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
                dateOfIssue: employmentCheckIssueDate,
                expiryDate: employmentCheckExpiryDate,
                updatedAt: new Date(),
              },
            });
          }
        }

        if (driverLicenceType) {
          const existingLicence = await prisma.driverLicence.findFirst({
            where: { employeeId: employee.id },
            orderBy: { updatedAt: "desc" },
          });

          if (existingLicence) {
            await prisma.driverLicence.update({
              where: { id: existingLicence.id },
              data: {
                type: driverLicenceType,
                licenceNumber: driverLicenceNumber!,
                issueDate: driverLicenceIssueDate!,
                expiryDate: driverLicenceExpiryDate!,
                updatedAt: new Date(),
              },
            });
          } else {
            await prisma.driverLicence.create({
              data: {
                id: crypto.randomUUID(),
                employeeId: employee.id,
                type: driverLicenceType,
                licenceNumber: driverLicenceNumber!,
                issueDate: driverLicenceIssueDate!,
                expiryDate: driverLicenceExpiryDate!,
                updatedAt: new Date(),
              },
            });
          }
        }

        // Create audit log entry
        await auditLog({
          entityType: "EMPLOYEE",
          entityId: employee.id,
          action: employeeAction,
          actorId: session.user.id,
          actorType: "USER",
          companyId: session.user.companyId,
          employeeId: employee.id,
          section: "CSV_IMPORT",
          field: employeeAction === "UPDATED" ? "__update__" : "__create__",
          oldValue: undefined,
          newValue:
            employeeAction === "UPDATED"
              ? "Employee updated via CSV import"
              : "Employee created via CSV import",
          reason: "CSV Import",
          metadata: {
            importBatch: `${importBatchId}_row_${rowNumber}`,
            rowNumber,
            importedFields: Object.keys(validatedData),
            holiday: {
              totalBalance: holidayTotalBalance,
              carryover: holidayCarryover,
              currentBalance: holidayCurrentBalance,
              holidayYear,
            },
            updateMode: canUpdateExistingUser,
          },
        });

        results.successful++;
        const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
        if (employeeAction === "UPDATED") {
          results.updated.push({
            id: employee.id,
            email: user.email,
            name: displayName,
          });
        } else {
          results.created.push({
            id: employee.id,
            email: user.email,
            name: displayName,
          });
        }

        // Track manager relationship for second pass if specified
        if (managerInfo.managerEmail || managerInfo.lineManagerName) {
          managerRelationships.push({
            userId: user.id,
            email: user.email,
            managerEmail: managerInfo.managerEmail,
            lineManagerName: managerInfo.lineManagerName,
            rowNumber,
          });
        }
      } catch (error) {
        results.failed++;
        if (error instanceof z.ZodError) {
          results.errors.push({
            row: rowNumber,
            errors: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
          });
        } else {
          results.errors.push({
            row: rowNumber,
            errors: [error instanceof Error ? error.message : "Unknown error"],
          });
        }
      }
      
      // Log progress after each batch
      console.log(`Batch ${batchIndex + 1}/${batches.length} completed. Success: ${results.successful}, Failed: ${results.failed}`);
    }
    }

    // Second pass: Process manager relationships
    console.log(`Processing ${managerRelationships.length} manager relationships...`);
    const managerWarnings: Array<{ row: number; errors: string[] }> = [];
    
    // Refresh user map with newly created users
    const allUsers = await prisma.user.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, email: true, firstName: true, lastName: true, name: true },
    });
    const updatedUserEmailMap = new Map(allUsers.map(u => [u.email.toLowerCase(), u]));
    
    for (const relationship of managerRelationships) {
      try {
        let managerUser = null;
        
        // Try to find manager by email first
        if (relationship.managerEmail) {
          managerUser = updatedUserEmailMap.get(relationship.managerEmail.toLowerCase());
        }
        
        // If not found by email, try by name using in-memory search
        if (!managerUser && relationship.lineManagerName) {
          const managerNameParts = relationship.lineManagerName.split(/\s+/).filter(Boolean);
          const matchingManagers = [];

          for (const user of allUsers) {
            const userFirstName = (user.firstName || '').toLowerCase();
            const userLastName = (user.lastName || '').toLowerCase();
            const userName = (user.name || '').toLowerCase();
            const searchName = relationship.lineManagerName.toLowerCase();

            // Try different matching strategies
            if (managerNameParts.length >= 2) {
              const firstNamePart = managerNameParts[0].toLowerCase();
              const lastNamePart = managerNameParts.slice(1).join(" ").toLowerCase();
              
              if (userFirstName === firstNamePart && userLastName === lastNamePart) {
                matchingManagers.push(user);
                continue;
              }
            }

            // Try full name match
            if (userName === searchName) {
              matchingManagers.push(user);
              continue;
            }

            // Try single name match
            if (managerNameParts.length === 1) {
              const singleName = managerNameParts[0].toLowerCase();
              if (userFirstName === singleName || userLastName === singleName) {
                matchingManagers.push(user);
              }
            }
          }

          if (matchingManagers.length === 1) {
            managerUser = matchingManagers[0];
          } else if (matchingManagers.length > 1) {
            managerWarnings.push({
              row: relationship.rowNumber,
              errors: [`Multiple managers match "${relationship.lineManagerName}". Manager relationship not set.`],
            });
            continue;
          }
        }
        
        // Store successful manager relationships for batch update
        if (managerUser) {
          relationship.managerUserId = managerUser.id;
        } else {
          // Add warning but don't fail the import
          const managerRef = relationship.managerEmail || relationship.lineManagerName;
          managerWarnings.push({
            row: relationship.rowNumber,
            errors: [`Manager "${managerRef}" not found. Employee imported without manager relationship.`],
          });
        }
      } catch (error) {
        console.warn(`Failed to set manager for user ${relationship.userId}:`, error);
        managerWarnings.push({
          row: relationship.rowNumber,
          errors: [`Failed to set manager relationship: ${error instanceof Error ? error.message : 'Unknown error'}`],
        });
      }
    }
    
    // Batch update manager relationships
    const successfulRelationships = managerRelationships.filter(r => r.managerUserId);
    console.log(`Updating ${successfulRelationships.length} manager relationships...`);
    
    if (successfulRelationships.length > 0) {
      // Process in batches to avoid overwhelming the database
      const updateBatchSize = 20;
      for (let i = 0; i < successfulRelationships.length; i += updateBatchSize) {
        const batch = successfulRelationships.slice(i, i + updateBatchSize);
        
        await Promise.all(
          batch.map(relationship =>
            prisma.user.update({
              where: { id: relationship.userId },
              data: { managerId: relationship.managerUserId },
            })
          )
        );
      }
      
      // Promote managers if needed (collect unique manager IDs first)
      const uniqueManagerIds = [...new Set(successfulRelationships.map(r => r.managerUserId).filter(Boolean))];
      console.log(`Promoting ${uniqueManagerIds.length} managers if needed...`);
      
      await Promise.all(
        uniqueManagerIds.map(managerId =>
          promoteManagerIfNeeded(managerId!, session.user.companyId)
        )
      );
    }
    
    // Add manager warnings to results
    if (managerWarnings.length > 0) {
      results.errors.push(...managerWarnings);
    }

    // Create audit log for the entire import
    await auditLog({
      entityType: "CSV_IMPORT",
      entityId: `batch_${Date.now()}`,
      action: "COMPLETED",
      actorId: session.user.id,
      actorType: "USER",
      companyId: session.user.companyId,
      changes: {
        totalRecords: results.total,
        successful: results.successful,
        failed: results.failed,
        fileName: file.name,
        updated: results.updated.length,
      },
      metadata: {
        importType: "EMPLOYEES",
        errors: results.errors,
        allowUpdates,
        subTemplates: subTemplateScope ?? "all",
      },
    });

    return NextResponse.json({
      message: "Import completed",
      results,
    });
  } catch (error) {
    console.error("CSV import error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Template generation endpoint
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subTemplateScope = extractScopeFromRequest(request);

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

    const headers = filterHeadersByScope(subTemplateScope);

    const enrichedSampleRows = EMPLOYEE_SAMPLE_ROWS.map((row, index) => {
      if (index === 0) {
        return {
          ...row,
          departmentName: departments[0]?.name || row.departmentName,
          jobRoleName: jobRoles[0]?.name || row.jobRoleName,
          workingPatternName: workingPatterns[0]?.name || row.workingPatternName,
        };
      }

      if (index === 1) {
        return {
          ...row,
          departmentName: departments[1]?.name || row.departmentName,
          jobRoleName: jobRoles[1]?.name || row.jobRoleName,
          workingPatternName: workingPatterns[1]?.name || row.workingPatternName,
        };
      }

      return row;
    });

    const sampleData = enrichedSampleRows.map(row => filterSampleRow(row, headers));

    const csvContent = [
      headers.join(","),
      ...sampleData.map(row => headers.map(header => JSON.stringify(row[header] ?? "")).join(",")),
    ].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=employee_import_template.csv",
      },
    });
  } catch (error) {
    console.error("Template generation error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
