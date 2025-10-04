import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { parse } from "csv-parse/sync";
import { auditLog } from "@/lib/audit";
import { TaxCode } from "@prisma/client";

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
  salaryAmount: z.string().optional(),
  salary: z.string().optional(),
  hourlyRate: z.string().optional(),
  hourly: z.string().optional(),

  // Emergency contacts
  emergencyContactName: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactEmail: z.string().optional(),

  // Payroll & compliance
  bankAccountNumber: z.string().optional(),
  irdNumber: z.string().optional(),
  taxCode: z.string().optional(),
  kiwiSaverEnrolled: z.string().optional(),
  kiwiSaverContribution: z.string().optional(),

  // Driver licence
  driverLicenceType: z.string().optional(),
  driverLicenceNumber: z.string().optional(),
  driverLicenceIssueDate: z.string().optional(),
  driverLicenceExpiryDate: z.string().optional(),

  // Training & compliance
  trainingCourse: z.string().optional(),
  trainingProvider: z.string().optional(),
  trainingDateCompleted: z.string().optional(),
  trainingExpiryDate: z.string().optional(),
  employmentCheckType: z.string().optional(),
  employmentCheckDocumentNumber: z.string().optional(),
  employmentCheckIssueDate: z.string().optional(),
  employmentCheckExpiryDate: z.string().optional(),
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

const parseOptionalInteger = (value: string | undefined, label: string): number | undefined => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid ${label} "${trimmed}". Please provide a whole number.`);
  }
  return parsed;
};

const parseOptionalBoolean = (value: string | undefined, label: string): boolean | undefined => {
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const normalised = trimmed.toLowerCase();
  if (["yes", "true", "1", "y"].includes(normalised)) return true;
  if (["no", "false", "0", "n"].includes(normalised)) return false;
  throw new Error(`Invalid ${label} "${value}". Use Yes/No or True/False.`);
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
  const trimmed = trimToUndefined(value);
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  const withSpaces = upper.replace(/[_-]+/g, " ");
  const condensed = withSpaces.replace(/\s+/g, "");
  return TAX_CODE_LOOKUP[withSpaces] || TAX_CODE_LOOKUP[condensed];
};

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const allowUpdates = String(formData.get("allowUpdates") ?? "false").toLowerCase() === "true";
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
      updated: [] as Array<{ id: string; email: string; name: string }>,
    };

    const importBatchId = `csv_import_${Date.now()}`;

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const rowNumber = i + 2; // +2 because CSV headers are row 1, data starts at row 2

      try {
        // Validate the record
        const validatedData = employeeImportSchema.parse(record);

        const email = validatedData.email.trim().toLowerCase();
        const firstName = validatedData.firstName.trim();
        const lastName = validatedData.lastName.trim();

        // Check if user already exists
        const existingUser = await prisma.user.findFirst({
          where: {
            email,
            companyId: session.user.companyId,
          },
          include: {
            Employee: true,
          },
        });

        if (existingUser && !allowUpdates) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            errors: [`User with email ${validatedData.email} already exists`],
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

        const holidayTotalBalance = parseOptionalNumber(validatedData.holidayTotalBalance, "holidayTotalBalance");
        const holidayCarryover = parseOptionalNumber(validatedData.holidayCarryover, "holidayCarryover");
        const holidayCurrentBalance = parseOptionalNumber(validatedData.holidayCurrentBalance, "holidayCurrentBalance");
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

        const departmentName = trimToUndefined(validatedData.departmentName);
        const jobRoleName = trimToUndefined(validatedData.jobRoleName) ?? trimToUndefined(validatedData.jobTitle);
        const employmentType = normaliseEmploymentType(validatedData.employmentType);
        const contractType = normaliseContractType(validatedData.contractType);
        const siteLocation = trimToUndefined(validatedData.siteLocation);
        const startDate = parseOptionalDate(validatedData.startDate, "startDate");
        const contractEndDate = parseOptionalDate(validatedData.contractEndDate, "contractEndDate");
        const workingPatternName = trimToUndefined(validatedData.workingPatternName);
        const managerEmail = trimToUndefined(validatedData.managerEmail);
        if (managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) {
          throw new Error(`Invalid managerEmail "${managerEmail}". Provide a valid email address.`);
        }

        const salaryAmount = parseOptionalNumber(
          validatedData.salaryAmount ?? validatedData.salary,
          "salaryAmount"
        );
        const hourlyRate = parseOptionalNumber(
          validatedData.hourlyRate ?? validatedData.hourly,
          "hourlyRate"
        );
        const bankAccountNumber = trimToUndefined(validatedData.bankAccountNumber);
        const irdNumber = trimToUndefined(validatedData.irdNumber);
        const taxCodeInput = trimToUndefined(validatedData.taxCode);
        const taxCode = normaliseTaxCode(validatedData.taxCode);
        if (taxCodeInput && !taxCode) {
          throw new Error(
            `Invalid taxCode "${validatedData.taxCode}". Please use a valid New Zealand tax code (e.g. M, M SL, S, etc.).`
          );
        }
        const kiwiSaverEnrolled = parseOptionalBoolean(validatedData.kiwiSaverEnrolled, "kiwiSaverEnrolled");
        const kiwiSaverContribution = parseOptionalInteger(
          validatedData.kiwiSaverContribution,
          "kiwiSaverContribution"
        );

        const emergencyContactName = trimToUndefined(validatedData.emergencyContactName);
        const emergencyContactRelationship = trimToUndefined(validatedData.emergencyContactRelationship);
        const emergencyContactPhone = trimToUndefined(validatedData.emergencyContactPhone);
        const emergencyContactEmail = trimToUndefined(validatedData.emergencyContactEmail);
        if (emergencyContactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emergencyContactEmail)) {
          throw new Error(`Invalid emergencyContactEmail "${emergencyContactEmail}". Provide a valid email.`);
        }

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

        if (
          driverLicenceType ||
          driverLicenceNumber ||
          driverLicenceIssueDate ||
          driverLicenceExpiryDate
        ) {
          if (!driverLicenceType || !driverLicenceNumber || !driverLicenceIssueDate || !driverLicenceExpiryDate) {
            throw new Error(
              "Driver licence section requires type, number, issue date, and expiry date when any field is provided."
            );
          }
        }

        const trainingCourse = trimToUndefined(validatedData.trainingCourse);
        const trainingProvider = trimToUndefined(validatedData.trainingProvider);
        const trainingDateCompleted = parseOptionalDate(
          validatedData.trainingDateCompleted,
          "trainingDateCompleted"
        );
        const trainingExpiryDate = parseOptionalDate(
          validatedData.trainingExpiryDate,
          "trainingExpiryDate"
        );

        if (trainingCourse || trainingProvider || trainingDateCompleted) {
          if (!trainingCourse || !trainingProvider || !trainingDateCompleted) {
            throw new Error(
              "Training section requires course, provider, and date completed when any training data is supplied."
            );
          }
        }

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

        if (
          employmentCheckType ||
          employmentCheckDocumentNumber ||
          employmentCheckIssueDate ||
          employmentCheckExpiryDate
        ) {
          if (
            !employmentCheckType ||
            !employmentCheckDocumentNumber ||
            !employmentCheckIssueDate ||
            !employmentCheckExpiryDate
          ) {
            throw new Error(
              "Employment check section requires type, document number, issue date, and expiry date when any value is provided."
            );
          }
        }

        // Find department (must exist)
        let department = null;
        if (departmentName) {
          department = await prisma.department.findFirst({
            where: {
              name: departmentName,
              companyId: session.user.companyId,
            },
          });

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
          jobRole = await prisma.jobRole.findFirst({
            where: {
              name: jobRoleName,
              companyId: session.user.companyId,
            },
          });

          if (!jobRole) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              errors: [`Job role "${jobRoleName}" not found. Please import job roles first.`],
            });
            continue;
          }
        }

        // Find manager if provided
        let managerUser = null;
        if (managerEmail) {
          managerUser = await prisma.user.findFirst({
            where: {
              email: managerEmail,
              companyId: session.user.companyId,
            },
          });

          if (!managerUser) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              errors: [`Manager with email "${managerEmail}" not found. Import managers before their team members.`],
            });
            continue;
          }
        }

        // Find working pattern (must exist if provided)
        let workingPattern = null;
        if (workingPatternName) {
          workingPattern = await prisma.workingPattern.findFirst({
            where: {
              name: workingPatternName,
              companyId: session.user.companyId,
            },
          });

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
          const existingGender = await prisma.genderOption.findFirst({
            where: {
              companyId: session.user.companyId,
              label: { equals: gender, mode: "insensitive" },
            },
          });

          if (existingGender) {
            genderOptionId = existingGender.id;
          } else {
            const genderKeyBase = gender
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

        if (canUpdateExistingUser && existingUser) {
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
          if (managerUser) {
            userUpdateData.managerId = managerUser.id;
          }

          user = await prisma.user.update({
            where: { id: existingUser.id },
            data: userUpdateData,
          });

          const employeeUpdateData: Record<string, unknown> = {};
          if (bankAccountNumber !== undefined) employeeUpdateData.bankAccountNumber = bankAccountNumber;
          if (contractType !== undefined) employeeUpdateData.contractType = contractType;
          if (employmentType !== undefined) employeeUpdateData.employmentType = employmentType;
          if (salaryAmount !== undefined) employeeUpdateData.salaryAmount = salaryAmount;
          if (hourlyRate !== undefined) employeeUpdateData.hourlyRate = hourlyRate;
          if (startDate !== undefined) employeeUpdateData.startDate = startDate ?? null;
          if (contractEndDate !== undefined) employeeUpdateData.contractEndDate = contractEndDate ?? null;
          if (siteLocation !== undefined) employeeUpdateData.siteLocation = siteLocation;
          if (irdNumber !== undefined) employeeUpdateData.irdNumber = irdNumber;
          if (taxCodeInput !== undefined) employeeUpdateData.taxCode = taxCode ?? null;
          if (kiwiSaverEnrolled !== undefined) employeeUpdateData.kiwiSaverEnrolled = kiwiSaverEnrolled;
          if (kiwiSaverContribution !== undefined) {
            employeeUpdateData.kiwiSaverContribution = kiwiSaverContribution;
          }
          if (department) employeeUpdateData.departmentId = department.id;
          if (jobRole) employeeUpdateData.jobRoleId = jobRole.id;
          if (workingPattern) employeeUpdateData.workingPatternId = workingPattern.id;

          const employeeWasExisting = Boolean(existingUser.Employee);
          const upsertedEmployee = await prisma.employee.upsert({
            where: { userId: existingUser.id },
            update: employeeUpdateData,
            create: {
              id: crypto.randomUUID(),
              userId: existingUser.id,
              bankAccountNumber,
              contractType,
              employmentType,
              salaryAmount,
              hourlyRate,
              startDate: startDate ?? null,
              contractEndDate: contractEndDate ?? null,
              siteLocation,
              irdNumber,
              taxCode: taxCode ?? null,
              kiwiSaverEnrolled,
              kiwiSaverContribution,
              departmentId: department?.id,
              jobRoleId: jobRole?.id,
              workingPatternId: workingPattern?.id,
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

          if (managerUser) {
            await prisma.user.update({
              where: { id: user.id },
              data: { managerId: managerUser.id },
            });
          }

          employee = await prisma.employee.create({
            data: {
              id: crypto.randomUUID(),
              userId: user.id,
              bankAccountNumber,
              contractType,
              employmentType,
              salaryAmount,
              hourlyRate,
              startDate: startDate ?? null,
              contractEndDate: contractEndDate ?? null,
              siteLocation,
              irdNumber,
              taxCode: taxCode ?? null,
              kiwiSaverEnrolled,
              kiwiSaverContribution,
              departmentId: department?.id,
              jobRoleId: jobRole?.id,
              workingPatternId: workingPattern?.id,
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

        if (trainingCourse) {
          let course = await prisma.course.findFirst({
            where: {
              name: { equals: trainingCourse, mode: "insensitive" },
              OR: [
                { companyId: session.user.companyId },
                { companyId: null },
              ],
            },
          });

          if (!course) {
            course = await prisma.course.create({
              data: {
                id: crypto.randomUUID(),
                name: trainingCourse,
                companyId: session.user.companyId,
              },
            });
          }

          let provider = await prisma.trainingProvider.findFirst({
            where: {
              name: { equals: trainingProvider!, mode: "insensitive" },
              OR: [
                { companyId: session.user.companyId },
                { companyId: null },
              ],
            },
          });

          if (!provider) {
            provider = await prisma.trainingProvider.create({
              data: {
                id: crypto.randomUUID(),
                name: trainingProvider!,
                companyId: session.user.companyId,
              },
            });
          }

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

        if (employmentCheckType) {
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
                documentNumber: employmentCheckDocumentNumber!,
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
                documentNumber: employmentCheckDocumentNumber!,
                dateOfIssue: employmentCheckIssueDate!,
                expiryDate: employmentCheckExpiryDate!,
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
            compliance: {
              driverLicenceCreated: Boolean(driverLicenceType),
              trainingRecordCreated: Boolean(trainingCourse),
              employmentCheckCreated: Boolean(employmentCheckType),
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
        updated: results.updated.length,
      },
      metadata: {
        importType: "EMPLOYEES",
        errors: results.errors,
        allowUpdates,
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

    const sampleData = [
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
