// app/api/onboarding/step/[stepId]/complete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { validateIRDNumber } from "@/lib/payroll/validators";
import { isValidNzBankAccountNumber, normalizeBankAccountNumber } from "@/lib/utils";
import { validatePhone, validateEmail } from "@/lib/validators";
import { canAccessEmployee } from "@/lib/permissions";
import { logStepChange } from "@/lib/onboarding/audit-logger";
import type { OnboardingStepType } from "@prisma/client";

type CompletionPayload = Record<string, unknown>;

// Allowed file types for document uploads
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validation errors for form data sync
 */
interface FormDataValidationResult {
  isValid: boolean;
  errors: { field: string; message: string }[];
  sanitizedData: Record<string, any>;
}

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
 * Sensitive payroll/salary fields that can ONLY be synced by ADMIN or SUPER_ADMIN.
 * Non-admin users (EMPLOYEE, MANAGER) cannot update these fields via onboarding completion.
 * This prevents privilege escalation where employees could modify their own compensation.
 */
export const ADMIN_ONLY_SYNC_FIELDS = new Set([
  // Salary/compensation fields
  "salaryAmount",
  "hourlyRate",
  // Employer contribution rates (employee can set their own rate, but not employer's)
  "kiwiSaverEmployerRate",
]);

/**
 * Sanitizes a string to prevent XSS attacks
 */
function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 500); // Limit length
}

/**
 * Validates and sanitizes form data before syncing to employee profile.
 * Returns validation errors and sanitized data.
 */
function validateFormDataForSync(
  normalizedData: Record<string, any>
): FormDataValidationResult {
  const errors: { field: string; message: string }[] = [];
  const sanitizedData: Record<string, any> = {};

  // Validate phone number
  if (normalizedData.phone) {
    const phoneValidation = validatePhone(String(normalizedData.phone));
    if (!phoneValidation.isValid) {
      errors.push({ field: 'phone', message: phoneValidation.error || 'Invalid phone number' });
    } else {
      sanitizedData.phone = sanitizeString(String(normalizedData.phone));
    }
  }

  // Validate emergency contact phone
  if (normalizedData.emergencyContactPhone) {
    const phoneValidation = validatePhone(String(normalizedData.emergencyContactPhone));
    if (!phoneValidation.isValid) {
      errors.push({ field: 'emergencyContactPhone', message: phoneValidation.error || 'Invalid emergency contact phone' });
    } else {
      sanitizedData.emergencyContactPhone = sanitizeString(String(normalizedData.emergencyContactPhone));
    }
  }

  // Validate emergency contact email
  if (normalizedData.emergencyContactEmail) {
    const emailValidation = validateEmail(String(normalizedData.emergencyContactEmail));
    if (!emailValidation.isValid) {
      errors.push({ field: 'emergencyContactEmail', message: emailValidation.error || 'Invalid emergency contact email' });
    } else {
      sanitizedData.emergencyContactEmail = sanitizeString(String(normalizedData.emergencyContactEmail));
    }
  }

  // Validate IRD number
  if (normalizedData.irdNumber) {
    const irdValidation = validateIRDNumber(String(normalizedData.irdNumber));
    if (!irdValidation.isValid) {
      errors.push({ field: 'irdNumber', message: irdValidation.error || 'Invalid IRD number' });
    } else {
      sanitizedData.irdNumber = irdValidation.formatted || String(normalizedData.irdNumber).replace(/[\s-]/g, '');
    }
  }

  // Validate bank account number
  if (normalizedData.bankAccountNumber) {
    const normalized = normalizeBankAccountNumber(String(normalizedData.bankAccountNumber));
    if (!isValidNzBankAccountNumber(normalized)) {
      errors.push({ field: 'bankAccountNumber', message: 'Invalid NZ bank account number (must be 15-16 digits)' });
    } else {
      sanitizedData.bankAccountNumber = normalized;
    }
  }

  // Validate tax code
  if (normalizedData.taxCode) {
    const validTaxCodes = ['M', 'ME', 'M SL', 'ME SL', 'SB', 'SB SL', 'S', 'S SL', 'SH', 'SH SL', 'ST', 'ST SL', 'SA', 'SA SL', 'SL', 'CAE', 'EDW', 'ND', 'NS', 'STC', 'WT', 'P'];
    const taxCode = String(normalizedData.taxCode).toUpperCase().trim();
    if (!validTaxCodes.includes(taxCode)) {
      errors.push({ field: 'taxCode', message: `Invalid tax code: ${taxCode}` });
    } else {
      sanitizedData.taxCode = taxCode;
    }
  }

  // Sanitize text fields
  const textFields = [
    'addressStreet', 'addressCity', 'addressPostcode', 'addressCountry',
    'nationalId', 'pronouns', 'emergencyContactName', 'emergencyContactRelationship'
  ];
  for (const field of textFields) {
    if (normalizedData[field]) {
      sanitizedData[field] = sanitizeString(String(normalizedData[field]));
    }
  }

  // Copy through validated numeric fields
  const numericFields = ['salaryAmount', 'hourlyRate', 'kiwiSaverEmployeeRate', 'kiwiSaverEmployerRate', 'kiwiSaverContribution'];
  for (const field of numericFields) {
    if (normalizedData[field] !== undefined) {
      const num = parseFloat(normalizedData[field]);
      if (!isNaN(num) && num >= 0) {
        sanitizedData[field] = num;
      }
    }
  }

  // Copy through other validated fields
  if (normalizedData.dateOfBirth) {
    const dob = new Date(normalizedData.dateOfBirth);
    if (!isNaN(dob.getTime())) {
      sanitizedData.dateOfBirth = dob;
    }
  }

  if (normalizedData.gender) {
    sanitizedData.gender = String(normalizedData.gender).trim();
  }

  if (normalizedData.kiwiSaverStatus !== undefined) {
    sanitizedData.kiwiSaverStatus = normalizedData.kiwiSaverStatus;
  }

  if (normalizedData.kiwiSaverEnrolled !== undefined) {
    sanitizedData.kiwiSaverEnrolled = normalizedData.kiwiSaverEnrolled;
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData,
  };
}

/**
 * Checks if all onboarding steps are completed and updates instance status accordingly.
 * This ensures the OnboardingInstance is marked as "completed" when all steps are done.
 */
async function checkAndUpdateOnboardingCompletion(
  onboardingInstanceId: string
): Promise<{ completed: boolean; completedAt?: Date }> {
  // Get all step instances for this onboarding
  const stepInstances = await prisma.onboardingStepInstance.findMany({
    where: { onboardingInstanceId },
    select: { status: true },
  });

  // Check if all steps are completed
  const allCompleted = stepInstances.length > 0 && 
    stepInstances.every(step => step.status === 'completed');

  if (allCompleted) {
    const completedAt = new Date();
    
    // Update the onboarding instance to completed
    await prisma.onboardingInstance.update({
      where: { id: onboardingInstanceId },
      data: {
        status: 'completed',
        completedAt,
      },
    });

    console.log(`[onboarding/complete] Onboarding instance ${onboardingInstanceId} marked as completed`);
    
    return { completed: true, completedAt };
  }

  return { completed: false };
}

/**
 * Syncs form data to the employee's profile (User, Employee, and EmergencyContact records).
 * This enables onboarding forms to populate real profile data, eliminating double-entry.
 * Now includes validation and sanitization of all fields.
 * 
 * @param formData - The form data to sync
 * @param employeeId - The employee ID to sync to
 * @param userId - The user ID associated with the employee
 * @param companyId - The company ID for context
 * @param requesterRole - The role of the user making the request (for field filtering)
 */
async function syncFormDataToProfile(
  formData: Record<string, any>,
  employeeId: string,
  userId: string,
  companyId: string,
  requesterRole: string = "EMPLOYEE"
): Promise<{ success: boolean; errors?: { field: string; message: string }[]; droppedFields?: string[] }> {
  const isAdmin = requesterRole === "ADMIN" || requesterRole === "SUPER_ADMIN";
  const droppedFields: string[] = [];
  
  // Normalize field names using aliases
  const normalizedData: Record<string, any> = {};
  for (const [key, value] of Object.entries(formData)) {
    if (value === undefined || value === null || value === "") continue;
    const canonicalKey = FIELD_ALIASES[key] || key;
    
    // Filter out admin-only fields for non-admin users
    if (!isAdmin && ADMIN_ONLY_SYNC_FIELDS.has(canonicalKey)) {
      droppedFields.push(canonicalKey);
      console.warn(`[onboarding/sync] Blocked non-admin sync of restricted field "${canonicalKey}" for employee ${employeeId}`);
      continue;
    }
    
    normalizedData[canonicalKey] = value;
  }

  // Validate and sanitize all data
  const validation = validateFormDataForSync(normalizedData);
  
  if (!validation.isValid) {
    console.warn(`[onboarding/sync] Validation failed for employee ${employeeId}:`, validation.errors);
    return { success: false, errors: validation.errors };
  }

  const sanitized = validation.sanitizedData;

  // Prepare update objects for each model
  const userUpdate: Record<string, any> = {};
  const employeeUpdate: Record<string, any> = {};
  let emergencyContactData: Record<string, any> | null = null;

  // ========== USER FIELDS ==========
  if (sanitized.phone) {
    userUpdate.phone = sanitized.phone;
  }
  
  if (sanitized.dateOfBirth) {
    userUpdate.dateOfBirth = sanitized.dateOfBirth;
    employeeUpdate.dateOfBirth = sanitized.dateOfBirth;
  }
  
  if (sanitized.addressStreet) {
    userUpdate.addressStreet = sanitized.addressStreet;
  }
  if (sanitized.addressCity) {
    userUpdate.addressCity = sanitized.addressCity;
  }
  if (sanitized.addressPostcode) {
    userUpdate.addressPostcode = sanitized.addressPostcode;
  }
  if (sanitized.addressCountry) {
    userUpdate.addressCountry = sanitized.addressCountry;
  }
  
  if (sanitized.nationalId) {
    userUpdate.nationalId = sanitized.nationalId;
  }
  if (sanitized.pronouns) {
    userUpdate.pronouns = sanitized.pronouns;
  }
  
  // Handle gender - could be a genderOptionId or a text value that needs lookup
  if (sanitized.gender) {
    const genderValue = String(sanitized.gender).trim();
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
  if (sanitized.emergencyContactName) {
    emergencyContactData = {
      name: sanitized.emergencyContactName,
      phone: sanitized.emergencyContactPhone || null,
      relationship: sanitized.emergencyContactRelationship || null,
      email: sanitized.emergencyContactEmail || null,
    };
    
    // Also store on User model for quick access
    userUpdate.emergencyContactName = emergencyContactData.name;
    if (emergencyContactData.phone) userUpdate.emergencyContactPhone = emergencyContactData.phone;
    if (emergencyContactData.relationship) userUpdate.emergencyContactRelationship = emergencyContactData.relationship;
  }

  // ========== EMPLOYEE/PAYROLL FIELDS ==========
  if (sanitized.bankAccountNumber) {
    employeeUpdate.bankAccountNumber = sanitized.bankAccountNumber;
  }
  if (sanitized.irdNumber) {
    employeeUpdate.irdNumber = sanitized.irdNumber;
  }
  if (sanitized.taxCode) {
    employeeUpdate.taxCode = sanitized.taxCode;
  }
  
  // KiwiSaver handling
  if (sanitized.kiwiSaverStatus) {
    const status = String(sanitized.kiwiSaverStatus).toLowerCase();
    employeeUpdate.kiwiSaverEnrolled = status === "enrolled" || status === "yes" || status === "true";
  }
  if (sanitized.kiwiSaverEnrolled !== undefined) {
    employeeUpdate.kiwiSaverEnrolled = 
      sanitized.kiwiSaverEnrolled === true || 
      sanitized.kiwiSaverEnrolled === "true" || 
      sanitized.kiwiSaverEnrolled === "yes" ||
      sanitized.kiwiSaverEnrolled === "enrolled";
  }
  if (sanitized.kiwiSaverEmployeeRate !== undefined) {
    employeeUpdate.kiwiSaverEmployeeRate = sanitized.kiwiSaverEmployeeRate;
  }
  if (sanitized.kiwiSaverEmployerRate !== undefined) {
    employeeUpdate.kiwiSaverEmployerRate = sanitized.kiwiSaverEmployerRate;
  }
  if (sanitized.kiwiSaverContribution !== undefined) {
    employeeUpdate.kiwiSaverContribution = sanitized.kiwiSaverContribution;
  }
  
  // Salary fields
  if (sanitized.salaryAmount !== undefined) {
    employeeUpdate.salaryAmount = sanitized.salaryAmount;
  }
  if (sanitized.hourlyRate !== undefined) {
    employeeUpdate.hourlyRate = sanitized.hourlyRate;
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

  // Log audit entry for sensitive field updates
  const sensitiveFields = ['irdNumber', 'bankAccountNumber', 'taxCode'];
  const updatedSensitiveFields = sensitiveFields.filter(f => sanitized[f]);
  if (updatedSensitiveFields.length > 0) {
    console.log(`[onboarding/sync] Sensitive fields updated for employee ${employeeId}: ${updatedSensitiveFields.join(', ')}`);
  }

  return { success: true, droppedFields: droppedFields.length > 0 ? droppedFields : undefined };
}

/**
 * Validates uploaded file for document upload steps
 */
function validateUploadedFile(body: any): { isValid: boolean; error?: string } {
  if (!body.fileUrl) {
    return { isValid: false, error: 'File URL is required' };
  }

  // Validate file type if provided
  if (body.fileType && !ALLOWED_FILE_TYPES.includes(body.fileType)) {
    return { 
      isValid: false, 
      error: `Invalid file type: ${body.fileType}. Allowed types: PDF, PNG, JPG, DOCX` 
    };
  }

  // Validate file size if provided
  if (body.fileSize && body.fileSize > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File too large: ${Math.round(body.fileSize / 1024 / 1024)}MB. Maximum size: 10MB` 
    };
  }

  // Validate file name
  if (body.fileName) {
    const sanitizedName = body.fileName.replace(/[<>:"/\\|?*]/g, '');
    if (sanitizedName.length > 255) {
      return { isValid: false, error: 'File name too long (max 255 characters)' };
    }
  }

  return { isValid: true };
}

/**
 * Validates that required evidence exists before allowing step completion.
 * Returns validation result with error message if evidence is missing.
 */
async function validateStepEvidence(
  stepType: OnboardingStepType,
  stepDocumentId: string | null,
  employeeId: string,
  stepInstanceId: string,
  completionPayload: CompletionPayload | null,
  body: any
): Promise<{ isValid: boolean; error?: string }> {
  switch (stepType) {
    case "ACKNOWLEDGE_DOCUMENT": {
      // Require an existing DocumentAcknowledgement for the step's linked document
      if (!stepDocumentId) {
        return { 
          isValid: false, 
          error: "Step configuration error: No document linked to acknowledgement step" 
        };
      }
      
      const acknowledgement = await prisma.documentAcknowledgement.findUnique({
        where: {
          documentId_employeeId: {
            documentId: stepDocumentId,
            employeeId: employeeId,
          },
        },
      });
      
      if (!acknowledgement) {
        return { 
          isValid: false, 
          error: "Document must be acknowledged before completing this step" 
        };
      }
      return { isValid: true };
    }

    case "UPLOAD_DOCUMENT": {
      // Require a document record tied to the employee/step
      // Check if a document is being uploaded in this request OR already exists
      if (body.fileUrl) {
        // Document is being uploaded with this completion request - valid
        return { isValid: true };
      }
      
      // Check if a document was already uploaded for this step (stored in step response)
      const existingResponse = await prisma.onboardingStepResponse.findFirst({
        where: { 
          onboardingStepInstanceId: stepInstanceId,
        },
        orderBy: { createdAt: "desc" },
      });
      
      if (existingResponse?.response && typeof existingResponse.response === "object") {
        const response = existingResponse.response as Record<string, unknown>;
        if (response.documentId) {
          // Verify the document still exists (it may have been deleted)
          const documentExists = await prisma.document.findUnique({
            where: { id: response.documentId as string },
            select: { id: true },
          });
          
          if (!documentExists) {
            return { 
              isValid: false, 
              error: "The previously uploaded document no longer exists. Please upload a new document.",
              errorCode: "DOCUMENT_DELETED" 
            } as { isValid: boolean; error?: string; errorCode?: string };
          }
          
          // Document was previously uploaded and still exists - valid
          return { isValid: true };
        }
      }
      
      return { 
        isValid: false, 
        error: "A document must be uploaded before completing this step" 
      };
    }

    case "FORM_FILL":
    case "FILL_FORM_BY_SLUG": {
      // Require formResponse in the completion payload
      if (!completionPayload?.formResponse) {
        return { 
          isValid: false, 
          error: "Form response is required to complete this step" 
        };
      }
      
      // Validate that formResponse is a non-empty object
      const formResponse = completionPayload.formResponse;
      if (typeof formResponse !== "object" || formResponse === null) {
        return { 
          isValid: false, 
          error: "Form response must be a valid object" 
        };
      }
      
      return { isValid: true };
    }

    default:
      // Other step types don't require specific evidence validation
      return { isValid: true };
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
            OnboardingTemplate: {
              select: { id: true },
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

    // Authorization check: determine if user can complete this step
    const isOwnStep = session.user.id === onboardingUser.id;
    const isAdminOrSuperAdmin = session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";
    
    if (!isOwnStep) {
      // For non-self completion, check proper authorization
      if (isAdminOrSuperAdmin) {
        // ADMIN/SUPER_ADMIN can complete for any employee in their company
        // Log audit entry for admin override
        try {
          await logStepChange({
            companyId: session.user.companyId,
            templateId: stepInstance.OnboardingInstance?.OnboardingTemplate?.id || "unknown",
            stepId: stepId,
            stepLabel: stepInstance.OnboardingStep?.label || "Unknown Step",
            changeType: "metadata_change",
            fieldName: "admin_override_completion",
            oldValue: { status: stepInstance.status },
            newValue: { 
              status: "completed", 
              completedBy: session.user.id,
              completedFor: onboardingUser.id,
              overrideType: "admin_completion"
            },
            changedById: session.user.id,
            reason: `Admin/Super Admin completed step on behalf of employee ${onboardingEmployee.id}`,
          });
        } catch (auditError) {
          // Log but don't fail the operation if audit logging fails
          console.error("[onboarding/complete] Failed to create audit log for admin override:", auditError);
        }
      } else if (session.user.role === "MANAGER") {
        // MANAGER can only complete for their direct reports
        const canAccess = await canAccessEmployee(
          {
            id: session.user.id,
            role: session.user.role as "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN",
            companyId: session.user.companyId,
          },
          onboardingEmployee.id
        );
        
        if (!canAccess) {
          return NextResponse.json(
            { error: "Forbidden: You can only complete steps for employees you manage" },
            { status: 403 }
          );
        }
      } else {
        // Regular employees cannot complete steps for others
        return NextResponse.json(
          { error: "Forbidden: You can only complete your own onboarding steps" },
          { status: 403 }
        );
      }
    }

    // 2. Validate required evidence before allowing completion
    const stepType = stepInstance.OnboardingStep?.type as OnboardingStepType | undefined;
    const stepDocumentId = stepInstance.OnboardingStep?.documentId || null;
    const completionPayload = extractCompletionPayload(body, stepType);
    
    if (stepType) {
      const evidenceValidation = await validateStepEvidence(
        stepType,
        stepDocumentId,
        onboardingEmployee.id,
        stepId,
        completionPayload,
        body
      );
      
      if (!evidenceValidation.isValid) {
        return NextResponse.json(
          { error: evidenceValidation.error, code: "MISSING_EVIDENCE" },
          { status: 400 }
        );
      }
    }

    // 3. Mark step as completed using optimistic locking pattern
    // 🔒 Bug Fix 1.3: Only update if status is not already completed (prevents race conditions)
    // This handles double-click scenarios and concurrent requests
    // Use a transaction to ensure atomicity of the check-and-update operation
    const completionResult = await prisma.$transaction(async (tx) => {
      // First, check current status
      const currentStep = await tx.onboardingStepInstance.findUnique({
        where: { id: stepId },
        select: { status: true },
      });

      // If already completed, return early indicator
      if (currentStep?.status === "completed") {
        return { alreadyCompleted: true, updated: false };
      }

      // Update the step - within transaction this is safe from race conditions
      await tx.onboardingStepInstance.update({
        where: { id: stepId },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });

      return { alreadyCompleted: false, updated: true };
    });

    // If step was already completed (possibly by concurrent request), return success
    if (completionResult.alreadyCompleted) {
      return NextResponse.json(
        { success: true, message: "Step already completed", alreadyCompleted: true },
        { status: 200 }
      );
    }

    // 4. Save step response (supports new payload structures)
    if (completionPayload) {
      await prisma.onboardingStepResponse.create({
        data: {
          id: `response_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
          onboardingStepInstanceId: stepId,
          // Use a broad type cast here to avoid Prisma.InputJsonValue type issues
          response: completionPayload as any,
        },
      });
    }

    // 4b. Sync form data to employee profile
    // This handles FORM_FILL steps (formResponse), PAYROLL_SETUP steps (payrollValues),
    // and any other step that collects profile data. Enables onboarding to populate
    // real employee data without double-entry by administrators.
    const formDataToSync = 
      (completionPayload?.formResponse as Record<string, any>) ||
      (completionPayload?.payrollValues as Record<string, any>) ||
      null;

    let syncResult: { success: boolean; errors?: { field: string; message: string }[]; droppedFields?: string[] } | null = null;
    if (formDataToSync && typeof formDataToSync === "object") {
      try {
        syncResult = await syncFormDataToProfile(
          formDataToSync,
          onboardingEmployee.id,
          onboardingUser.id,
          session.user.companyId,
          session.user.role || "EMPLOYEE"
        );
        
        if (!syncResult.success && syncResult.errors) {
          console.warn(`[onboarding/complete] Form data validation errors for step ${stepId}:`, syncResult.errors);
          // Don't fail the step completion, but log the validation errors
        }
        
        if (syncResult.droppedFields && syncResult.droppedFields.length > 0) {
          console.log(`[onboarding/complete] Restricted fields dropped for non-admin user ${session.user.id}: ${syncResult.droppedFields.join(', ')}`);
        }
      } catch (syncError) {
        // Log but don't fail the step completion if sync fails
        console.error("Error syncing form data to profile:", syncError);
      }
    }

    // 4. Handle uploaded file - validate and link to Document table
    if (body.fileUrl) {
      // Validate the uploaded file
      const fileValidation = validateUploadedFile(body);
      if (!fileValidation.isValid) {
        return NextResponse.json({ 
          error: fileValidation.error,
          code: 'INVALID_FILE'
        }, { status: 400 });
      }

      // Sanitize file name
      const sanitizedFileName = (body.fileName || "Uploaded Document")
        .replace(/[<>:"/\\|?*]/g, '')
        .slice(0, 255);

      // Create document and link to onboarding step
      const document = await prisma.document.create({
        data: {
          id: `document_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: sanitizedFileName,
          url: body.fileUrl,
          path: body.filePath || body.fileUrl,
          size: body.fileSize || 0,
          type: body.fileType || "other",
          employeeId: onboardingEmployee.id,
          uploaderId: session.user.id,
          companyId: session.user.companyId,
        },
      });

      // Store document reference in step response for traceability
      await prisma.onboardingStepResponse.create({
        data: {
          id: `doc_response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          onboardingStepInstanceId: stepId,
          response: {
            documentId: document.id,
            documentName: sanitizedFileName,
            uploadedAt: new Date().toISOString(),
            fileType: body.fileType || "other",
            fileSize: body.fileSize || 0,
          } as any,
        },
      });

      console.log(`[onboarding/complete] Document ${document.id} uploaded and linked to step ${stepId}`);
    }

    // 5. Check if all steps are completed and update onboarding instance status
    const onboardingInstanceId = stepInstance.OnboardingInstance?.id;
    let onboardingCompleted = false;
    if (onboardingInstanceId) {
      const completionResult = await checkAndUpdateOnboardingCompletion(onboardingInstanceId);
      onboardingCompleted = completionResult.completed;
    }

    // 6. Log audit entry
    console.log(`[onboarding/complete] Step ${stepId} completed by user ${session.user.id}`);

    return NextResponse.json({ 
      ok: true,
      onboardingCompleted,
      syncErrors: syncResult?.errors || null,
    });
  } catch (err: any) {
    console.error("Error completing onboarding step:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
