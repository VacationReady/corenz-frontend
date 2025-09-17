"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export interface ChangeInfo {
  field: string;
  oldValue: string;
  newValue: string;
}

interface ChangeReasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  changes: ChangeInfo[];
  onSubmit: (reasons: Record<string, string>) => void;
  loading?: boolean;
}

// Convert field keys to human-readable labels
const fieldLabels: Record<string, string> = {
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

function titleCaseFromKey(key: string): string {
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

function labelForField(key: string): string {
  return fieldLabels[key] || titleCaseFromKey(key);
}

function formatValue(value: string): string {
  if (!value || value === "null") return "(empty)";
  
  // Handle dates
  if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    return new Date(value).toLocaleDateString();
  }
  
  // Handle boolean values
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  
  return value;
}

export default function ChangeReasonModal({
  isOpen,
  onClose,
  changes,
  onSubmit,
  loading = false,
}: ChangeReasonModalProps) {
  const [reasons, setReasons] = useState<Record<string, string>>({});

  // Reset reasons when modal opens/closes or changes change
  useEffect(() => {
    if (isOpen) {
      setReasons({});
    }
  }, [isOpen, changes]);

  const handleSubmit = () => {
    // Check that all required fields have reasons
    const missingReasons: string[] = [];
    
    for (const change of changes) {
      // Only require reason if new value is non-empty
      const requiresReason = Boolean(change.newValue);
      if (requiresReason && (!reasons[change.field] || reasons[change.field].trim() === "")) {
        missingReasons.push(labelForField(change.field));
      }
    }

    if (missingReasons.length > 0) {
      toast.error(`Please provide reasons for: ${missingReasons.join(", ")}`);
      return;
    }

    onSubmit(reasons);
  };

  const allReasonsProvided = changes.every(change => 
    !change.newValue || (reasons[change.field] && reasons[change.field].trim() !== "")
  );

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Please provide a reason for each change</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {changes.map((change, index) => (
            <div key={index} className="border rounded-lg p-4">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">
                  {labelForField(change.field)}
                </h4>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">From:</span> {formatValue(change.oldValue)} 
                  {" → "}
                  <span className="font-medium">To:</span> {formatValue(change.newValue)}
                </div>
              </div>
              
              {change.newValue ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for change <span className="text-red-500">*</span>
                  </label>
                  <Textarea
                    value={reasons[change.field] || ""}
                    onChange={(e) => 
                      setReasons(prev => ({ ...prev, [change.field]: e.target.value }))
                    }
                    placeholder="Enter reason for this change..."
                    className="min-h-[80px]"
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="text-sm text-gray-500 italic">
                  Field is being cleared - no reason required
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!allReasonsProvided || loading}
            loading={loading}
          >
            Confirm Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
