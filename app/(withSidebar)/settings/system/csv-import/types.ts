import type { CSVImportDomainId } from "@/lib/csv-import/domains";

export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  errors: Array<{ row: number; errors: string[] }>;
  created: Array<{ id: string; email: string; name: string }>;
  updated: Array<{ id: string; email: string; name: string }>;
  activation?: {
    total: number;
    activated: number;
    emailsSent: number;
    permissionsChecked: number;
    managersPromoted: number;
    errors: Array<{ employeeId: string; error: string }>;
    details: Array<{
      employeeId: string;
      name: string;
      email: string;
      status: string;
      actions: string[];
    }>;
  };
}

export interface ImportProgress {
  status: "idle" | "uploading" | "processing" | "completed" | "error";
  progress: number;
  message: string;
  result?: ImportResult;
}

export type ImportType = CSVImportDomainId;

export interface WelcomeEmailSummary {
  targeted: number;
  sent: number;
  skipped: number;
  errors: Array<{ employeeId: string; email: string; reason: string }>;
}

export interface ActivationStats {
  total: number;
  emailSent: number;
  emailNotSent: number;
  activated: number;
  pendingActivation: number;
}

export interface EmployeeActivationStatus {
  id: string;
  userId: string;
  name: string;
  email: string;
  department: string | null;
  departmentId: string | null;
  jobRole: string | null;
  jobRoleId: string | null;
  welcomeEmailSentAt: string | null;
  isActivated: boolean;
  status: "no_email" | "email_sent_pending" | "activated";
}

export interface WelcomeFilters {
  departmentIds: string[];
  locationIds: string[];
  nameQuery: string;
}

export interface SelectableOption {
  id: string;
  name: string;
}

export interface ActivationOptions {
  sendEmails: boolean;
  checkPermissions: boolean;
  promoteManagers: boolean;
}
