// app/api/onboarding/step/[stepId]/complete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";

type CompletionPayload = Record<string, unknown>;

/**
 * Maps common form field IDs to their canonical names for syncing.
 * This allows flexible field naming in forms while ensuring data syncs correctly.
 */
const FIELD_ALIASES: Record<string, string> = {
  // Phone aliases
  phone: "phone",
  mobile: "phone",
  mobilePhone: "phone",
  phoneNumber: "phone",
  contactNumber: "phone",
  
  // Date of birth aliases
  dateOfBirth: "dateOfBirth",
  dob: "dateOfBirth",
  birthDate: "dateOfBirth",
  birthday: "dateOfBirth",
  
  // Address aliases
  addressStreet: "addressStreet",
  streetAddress: "addressStreet",
  address: "addressStreet",
  street: "addressStreet",
  addressLine1: "addressStreet",
  
  addressCity: "addressCity",
  city: "addressCity",
  suburb: "addressCity",
  town: "addressCity",
  
  addressPostcode: "addressPostcode",
  postcode: "addressPostcode",
  postalCode: "addressPostcode",
  zipCode: "addressPostcode",
  zip: "addressPostcode",
  
  addressCountry: "addressCountry",
  country: "addressCountry",
  
  // Emergency contact aliases
  emergencyContactName: "emergencyContactName",
  emergencyName: "emergencyContactName",
  contactName: "emergencyContactName",
  nextOfKinName: "emergencyContactName",
  
  emergencyContactPhone: "emergencyContactPhone",
  emergencyPhone: "emergencyContactPhone",
  contactPhone: "emergencyContactPhone",
  nextOfKinPhone: "emergencyContactPhone",
  
  emergencyContactRelationship: "emergencyContactRelationship",
  emergencyRelationship: "emergencyContactRelationship",
  relationship: "emergencyContactRelationship",
  nextOfKinRelationship: "emergencyContactRelationship",
  
  emergencyContactEmail: "emergencyContactEmail",
  emergencyEmail: "emergencyContactEmail",
  contactEmail: "emergencyContactEmail",
  
  // Identity fields
  nationalId: "nationalId",
  nzId: "nationalId",
  passportNumber: "nationalId",
  
  pronouns: "pronouns",
  
  gender: "gender",
  genderOptionId: "gender",
  
  ethnicity: "ethnicity",
  
  // Bank/Payroll fields
  bankAccountNumber: "bankAccountNumber",
  bankAccount: "bankAccountNumber",
  accountNumber: "bankAccountNumber",
  
  irdNumber: "irdNumber",
  ird: "irdNumber",
  taxNumber: "irdNumber",
  
  taxCode: "taxCode",
  
  kiwiSaverEnrolled: "kiwiSaverEnrolled",
  kiwiSaverStatus: "kiwiSaverStatus",
  kiwiSaver: "kiwiSaverStatus",
  
  kiwiSaverContribution: "kiwiSaverContribution",
  kiwiSaverRate: "kiwiSaverEmployeeRate",
  kiwiSaverEmployeeRate: "kiwiSaverEmployeeRate",
  kiwiSaverEmployerRate: "kiwiSaverEmployerRate",
  
  // Salary fields
  salaryAmount: "salaryAmount",
  salary: "salaryAmount",
  annualSalary: "salaryAmount",
  
  hourlyRate: "hourlyRate",
  payRate: "hourlyRate",
};

/**
 * Syncs form data to the employee's profile (User, Employee, and EmergencyContact records).
 * This enables onboarding forms to populate real profile data, eliminating double-entry.
 */
async function syncFormDataToProfile(
  formData: Record<string, any>,
  employeeId: string,
  userId: string,
  companyId: string
): Promise<void> {
  // Normalize field names using aliases
  const normalizedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(formData)) {
    if (value === undefined || value === null || value === "") continue;
    const canonicalKey = FIELD_ALIASES[key] || key;
    normalizedData[canonicalKey] = value;
  }

  // Prepare update objects for each model
  const userUpdate: Record<string, any> = {};
  const employeeUpdate: Record<string, any> = {};
  let emergencyContactData: Record<string, any> | null = null;

  // ========== USER FIELDS ==========
  if (normalizedData.phone) {
    userUpdate.phone = String(normalizedData.phone).trim();
  }
  
  if (normalizedData.dateOfBirth) {
    const dob = new Date(normalizedData.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      userUpdate.dateOfBirth = dob;
      employeeUpdate.dateOfBirth = dob; // Also on Employee model
    }
  }
  
  if (normalizedData.addressStreet) {
    userUpdate.addressStreet = String(normalizedData.addressStreet).trim();
  }
  if (normalizedData.addressCity) {
    userUpdate.addressCity = String(normalizedData.addressCity).trim();
  }
  if (normalizedData.addressPostcode) {
    userUpdate.addressPostcode = String(normalizedData.addressPostcode).trim();
  }
  if (normalizedData.addressCountry) {
    userUpdate.addressCountry = String(normalizedData.addressCountry).trim();
  }
  
  if (normalizedData.nationalId) {
    userUpdate.nationalId = String(normalizedData.nationalId).trim();
  }
  if (normalizedData.pronouns) {
    userUpdate.pronouns = String(normalizedData.pronouns).trim();
  }
  
  // Handle gender - could be a genderOptionId or a text value that needs lookup
  if (normalizedData.gender) {
    const genderValue = String(normalizedData.gender).trim();
    // Check if it's already a UUID (genderOptionId)
    if (genderValue.includes("-") && genderValue.length > 30) {
      userUpdate.genderOptionId = genderValue;
    } else {
      // Try to find matching gender option by key or label
      const genderOption = await prisma.genderOption.findFirst({
        where: {
          companyId,
          OR: [
            { key: genderValue.toLowerCase() },
            { label: { equals: genderValue, mode: "insensitive" } },
          ],
        },
      });
      if (genderOption) {
        userUpdate.genderOptionId = genderOption.id;
      }
    }
  }

  // ========== EMERGENCY CONTACT ==========
  // If emergency contact fields provided, create/update EmergencyContact record
  if (normalizedData.emergencyContactName) {
    emergencyContactData = {
      name: String(normalizedData.emergencyContactName).trim(),
      phone: normalizedData.emergencyContactPhone ? String(normalizedData.emergencyContactPhone).trim() : null,
      relationship: normalizedData.emergencyContactRelationship ? String(normalizedData.emergencyContactRelationship).trim() : null,
      email: normalizedData.emergencyContactEmail ? String(normalizedData.emergencyContactEmail).trim() : null,
    };
    
    // Also store on User model for quick access
    userUpdate.emergencyContactName = emergencyContactData.name;
    if (emergencyContactData.phone) userUpdate.emergencyContactPhone = emergencyContactData.phone;
    if (emergencyContactData.relationship) userUpdate.emergencyContactRelationship = emergencyContactData.relationship;
  }

  // ========== EMPLOYEE/PAYROLL FIELDS ==========
  if (normalizedData.bankAccountNumber) {
    employeeUpdate.bankAccountNumber = String(normalizedData.bankAccountNumber).trim();
  }
  if (normalizedData.irdNumber) {
    employeeUpdate.irdNumber = String(normalizedData.irdNumber).trim();
  }
  if (normalizedData.taxCode) {
    employeeUpdate.taxCode = String(normalizedData.taxCode).trim().toUpperCase();
  }
  
  // KiwiSaver handling
  if (normalizedData.kiwiSaverStatus) {
    const status = String(normalizedData.kiwiSaverStatus).toLowerCase();
    employeeUpdate.kiwiSaverEnrolled = status === "enrolled" || status === "yes" || status === "true";
  }
  if (normalizedData.kiwiSaverEnrolled !== undefined) {
    employeeUpdate.kiwiSaverEnrolled = 
      normalizedData.kiwiSaverEnrolled === true || 
      normalizedData.kiwiSaverEnrolled === "true" || 
      normalizedData.kiwiSaverEnrolled === "yes" ||
      normalizedData.kiwiSaverEnrolled === "enrolled";
  }
  if (normalizedData.kiwiSaverEmployeeRate) {
    const rate = parseFloat(normalizedData.kiwiSaverEmployeeRate);
    if (!isNaN(rate)) {
      employeeUpdate.kiwiSaverEmployeeRate = rate;
    }
  }
  if (normalizedData.kiwiSaverEmployerRate) {
    const rate = parseFloat(normalizedData.kiwiSaverEmployerRate);
    if (!isNaN(rate)) {
      employeeUpdate.kiwiSaverEmployerRate = rate;
    }
  }
  if (normalizedData.kiwiSaverContribution) {
    const contribution = parseInt(normalizedData.kiwiSaverContribution, 10);
    if (!isNaN(contribution)) {
      employeeUpdate.kiwiSaverContribution = contribution;
    }
  }
  
  // Salary fields
  if (normalizedData.salaryAmount) {
    const salary = parseFloat(normalizedData.salaryAmount);
    if (!isNaN(salary)) {
      employeeUpdate.salaryAmount = salary;
    }
  }
  if (normalizedData.hourlyRate) {
    const rate = parseFloat(normalizedData.hourlyRate);
    if (!isNaN(rate)) {
      employeeUpdate.hourlyRate = rate;
    }
  }

  // ========== EXECUTE UPDATES ==========
  // Update User record
  if (Object.keys(userUpdate).length > 0) {
    await prisma.user.update({
      where: { id: userId },
      data: userUpdate,
    });
  }

  // Update Employee record
  if (Object.keys(employeeUpdate).length > 0) {
    await prisma.employee.update({
      where: { id: employeeId },
      data: employeeUpdate,
    });
  }

  // Create/Update EmergencyContact record
  if (emergencyContactData && emergencyContactData.name) {
    const existingContact = await prisma.emergencyContact.findFirst({
      where: { employeeId },
    });

    if (existingContact) {
      await prisma.emergencyContact.update({
        where: { id: existingContact.id },
        data: emergencyContactData,
      });
    } else {
      await prisma.emergencyContact.create({
        data: {
          id: randomUUID(),
          employeeId,
          name: emergencyContactData.name,
          phone: emergencyContactData.phone,
          relationship: emergencyContactData.relationship,
          email: emergencyContactData.email,
        },
      });
    }
  }
}

function extractCompletionPayload(body: any, stepType?: string): CompletionPayload | null {
  if (!body || typeof body !== "object") {
    if (stepType === "ACKNOWLEDGE_DOCUMENT") {
      return { acknowledged: true };
    }
    if (stepType === "UPLOAD_DOCUMENT") {
      return { uploaded: true };
    }
    return null;
  }

  const allowedKeys = [
    "formResponse",
    "trainingModules",
    "equipmentChecklist",
    "systemAccess",
    "managerCheckins",
    "buddyNotes",
    "complianceCourses",
    "payrollValues",
    "benefitLinks",
    "probationGoals",
    "surveyResponse",
    "questionSet",
    "journeyAutomation",
    "collected",
  ];

  const payload: CompletionPayload = {};

  for (const key of allowedKeys) {
    if (body[key] !== undefined) {
      payload[key] = body[key];
    }
  }

  if (stepType === "ACKNOWLEDGE_DOCUMENT" && payload.acknowledged === undefined) {
    payload.acknowledged = true;
  }

  if (stepType === "UPLOAD_DOCUMENT" && payload.uploaded === undefined) {
    payload.uploaded = true;
  }

  if (Object.keys(payload).length === 0) {
    return null;
  }

  return payload;
}

// Util: Parse JSON body (works for Next.js App Router POST)
async function parseBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(
  request: NextRequest,
  context: any,
) {
  const rawParams = context?.params;
  const { stepId } = rawParams?.then ? await rawParams : rawParams;
  const body = await parseBody(request);

  const session = await auth();

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Find step instance (and onboardingInstance, employee, company for security)
    const stepInstance = await prisma.onboardingStepInstance.findUnique({
      where: { id: stepId },
      include: {
        OnboardingInstance: {
          include: {
            Employee: {
              include: {
                User: true, // This gets you employee.user.companyId
              },
            },
          },
        },
        OnboardingStep: true,
      },
    });

    if (!stepInstance) {
      return NextResponse.json({ error: "Step not found." }, { status: 404 });
    }

    const onboardingEmployee = stepInstance.OnboardingInstance?.Employee;
    const onboardingUser = onboardingEmployee?.User;

    if (!onboardingEmployee || !onboardingUser) {
      return NextResponse.json({ error: "Step not accessible." }, { status: 404 });
    }

    if (onboardingUser.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedRoles = new Set(["ADMIN", "MANAGER", "SUPER_ADMIN"]);

    if (
      session.user.id !== onboardingUser.id &&
      !allowedRoles.has(session.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Mark step as completed
    await prisma.onboardingStepInstance.update({
      where: { id: stepId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    // 3. Save step response (supports new payload structures)
    const completionPayload = extractCompletionPayload(body, stepInstance.OnboardingStep?.type);
    if (completionPayload) {
      await prisma.onboardingStepResponse.create({
        data: {
          id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          onboardingStepInstanceId: stepId,
          // Use a broad type cast here to avoid Prisma.InputJsonValue type issues
          response: completionPayload as any,
        },
      });
    }

    // 3b. Sync form data to employee profile
    // This handles FORM_FILL steps (formResponse), PAYROLL_SETUP steps (payrollValues),
    // and any other step that collects profile data. Enables onboarding to populate
    // real employee data without double-entry by administrators.
    const formDataToSync = 
      (completionPayload?.formResponse as Record<string, any>) ||
      (completionPayload?.payrollValues as Record<string, any>) ||
      null;

    if (formDataToSync && typeof formDataToSync === "object") {
      try {
        await syncFormDataToProfile(
          formDataToSync,
          onboardingEmployee.id,
          onboardingUser.id,
          session.user.companyId
        );
      } catch (syncError) {
        // Log but don't fail the step completion if sync fails
        console.error("Error syncing form data to profile:", syncError);
      }
    }

    // 4. (Optional) Handle uploaded file - link to Document table if you have fileUrl
    if (body.fileUrl) {
      // You already have Document model; insert a new document and associate it to this step
      await prisma.document.create({
        data: {
          id: `document_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: body.fileName || "Uploaded Document",
          url: body.fileUrl,
          path: body.filePath || body.fileUrl,
          size: body.fileSize || 0,
          type: body.fileType || "other",
          employeeId: onboardingEmployee.id,
          uploaderId: session.user.id,
          companyId: session.user.companyId, // use validated tenant context
          // ...other fields
        },
      });
    }

    // 5. (Optional) Log to audit table here

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error completing onboarding step:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
