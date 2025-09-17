"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ChevronLeft, ChevronRight, Clock, User, FileText } from "lucide-react";
import { toast } from "sonner";

interface AuditLog {
  id: string;
  section: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string;
  changedAt: string;
  changedBy: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

interface AuditResponse {
  auditLogs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId: string;
  section?: string;
  field?: string;
  title?: string;
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
  __create__: "Record created",
  __delete__: "Record deleted",
};

function titleCaseFromKey(key: string): string {
  if (!key) return "";
  if (key === "__create__") return "Record created";
  if (key === "__delete__") return "Record deleted";
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

function formatValue(value: string | null): string {
  if (!value || value === "null") return "(empty)";
  
  // Handle dates
  if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
    return new Date(value).toLocaleDateString();
  }
  
  // Handle boolean values
  if (value === "true") return "Yes";
  if (value === "false") return "No";
  
  // Handle JSON payloads for create/delete or complex diffs
  try {
    const parsed = JSON.parse(value);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // Not JSON
  }
  return value;
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString("en-NZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getUserDisplayName(user: AuditLog["changedBy"]): string {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.email;
}

export default function HistoryModal({
  isOpen,
  onClose,
  employeeId,
  section,
  field,
  title = "Change History",
}: HistoryModalProps) {
  const [data, setData] = useState<AuditResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchAuditLogs = async (page: number = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      
      if (section) params.append("section", section);
      if (field) params.append("field", field);

      const response = await fetch(
        `/api/employees/${employeeId}/audit?${params.toString()}`
      );
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to fetch audit logs");
      }

      const result = await response.json();
      setData(result);
      setCurrentPage(page);
    } catch (error: any) {
      toast.error(error.message || "Failed to load history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCurrentPage(1);
      fetchAuditLogs(1);
    }
  }, [isOpen, employeeId, section, field]);

  const handlePageChange = (newPage: number) => {
    fetchAuditLogs(newPage);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading && !data ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading history...</p>
              </div>
            </div>
          ) : data?.auditLogs.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No change history found</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {data?.auditLogs.map((log) => (
                    <div key={log.id} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {labelForField(log.field)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDateTime(log.changedAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User className="h-4 w-4" />
                          {getUserDisplayName(log.changedBy)}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700">From:</span>
                          <div className="text-sm text-gray-900 mt-1 p-2 bg-red-50 rounded border">
                            {formatValue(log.oldValue)}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700">To:</span>
                          <div className="text-sm text-gray-900 mt-1 p-2 bg-green-50 rounded border">
                            {formatValue(log.newValue)}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <span className="text-sm font-medium text-gray-700">Reason:</span>
                        <div className="text-sm text-gray-900 mt-1 p-2 bg-blue-50 rounded border">
                          {log.reason}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {data && data.pagination.totalPages > 1 && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Showing {((data.pagination.page - 1) * data.pagination.limit) + 1} to{" "}
                      {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{" "}
                      {data.pagination.total} entries
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={!data.pagination.hasPrev || loading}
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-gray-600">
                        Page {data.pagination.page} of {data.pagination.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={!data.pagination.hasNext || loading}
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="border-t pt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
