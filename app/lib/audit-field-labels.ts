// Shared audit field label helpers extracted from ChangeReasonModal

// Convert field keys to human-readable labels
export const fieldLabels: Record<string, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  phone: "Phone",
  dateOfBirth: "Date of birth",
  addressStreet: "Address street",
  addressCity: "Address city",
  addressPostcode: "Address postcode",
  addressCountry: "Address country",
  emergencyContactName: "Emergency contact name",
  emergencyContactRelationship: "Emergency contact relationship",
  emergencyContactPhone: "Emergency contact phone",
  nationalId: "National ID",
  residencyStatus: "Residency status",
  pronouns: "Pronouns",
  genderOptionId: "Gender",
  bankAccountNumber: "Bank account number",
  taxCode: "Tax code",
  kiwiSaverEnrolled: "KiwiSaver enrolled",
  kiwiSaverContribution: "KiwiSaver contribution",
  employmentType: "Employment type",
  contractType: "Contract type",
  siteLocation: "Site location",
  startDate: "Start date",
  departmentId: "Department",
  managerId: "Manager",
  salaryAmount: "Salary amount",
  hourlyRate: "Hourly rate",
  isActive: "Active status",
  name: "Name",
  relationship: "Relationship",
  // Employment checks, driver licences, training, offboarding, settings
  typeOfCheck: "Type of check",
  documentNumber: "Document number",
  dateOfIssue: "Issue date",
  issueDate: "Issue date",
  expiryDate: "Expiry date",
  courseId: "Course",
  providerId: "Provider",
  assetsToReturn: "Assets to return",
  workingPatternId: "Working pattern",
  workingPatternAssignment: "Working pattern assignment",
  effectiveDate: "Effective date",
  exitInterviewInvite: "Exit interview invite",
  exitInterviewFormInvite: "Exit interview form invite",
  type: "Type",
  licenceNumber: "Licence number",
  // Synthetic
  __create__: "Record created",
  __delete__: "Record deleted",
};

export function titleCaseFromKey(key: string): string {
  if (!key) return "";
  // Handle synthetic keys
  if (key === "__create__") return "Record created";
  if (key === "__delete__") return "Record deleted";
  // Replace common separators and split camelCase
  const spaced = key
    .replace(/__/g, " ")
    .replace(/[_.-]/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export function labelForField(key: string): string {
  return fieldLabels[key] || titleCaseFromKey(key);
}

export function formatAuditValue(value: string | null | undefined): string {
  if (!value || value === "null") return "(empty)";
  
  // Handle dates
  if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    return new Date(value).toLocaleDateString('en-NZ');
  }
  
  // Handle boolean values
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  
  return value;
}
