// Bug Reporting System Types
// Requirements: 3.1, 3.2

// Enums matching Prisma schema
export type BugSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type BugStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED' | 'WONT_FIX';

// Core interfaces matching Prisma models
export interface BugAttachment {
  id: string;
  bugReportId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  createdAt: Date | string;
}

export interface BugComment {
  id: string;
  bugReportId: string;
  authorId: string;
  content: string;
  isAdminOnly: boolean;
  createdAt: Date | string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface BugReport {
  id: string;
  title: string;
  description: string;
  stepsToReproduce?: string | null;
  severity: BugSeverity;
  status: BugStatus;
  pageUrl: string;
  userAgent: string;
  adminNotes?: string | null; // Only included for tenant admins
  resolvedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  submitterId: string;
  companyId: string;
  submitter?: {
    id: string;
    name: string;
    email: string;
  };
  company?: {
    id: string;
    name: string;
  };
  attachments?: BugAttachment[];
  comments?: BugComment[];
  _count?: {
    comments: number;
    attachments: number;
  };
}

// Extended type for tenant admin views (includes tenant info)
export interface BugReportWithTenant extends BugReport {
  company: {
    id: string;
    name: string;
  };
}

// Statistics interface for admin dashboard
export interface BugStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  wontFix: number;
  bySeverity: Record<BugSeverity, number>;
  byTenant: Array<{ companyId: string; companyName: string; count: number }>;
}

// API Request Types
export interface CreateBugRequest {
  title: string;
  description: string;
  stepsToReproduce?: string;
  severity: BugSeverity;
}

export interface UpdateBugRequest {
  status?: BugStatus;
  adminNotes?: string;
}

// API Query Parameters
export interface ListBugsQuery {
  status?: BugStatus;
  severity?: BugSeverity;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'status' | 'severity' | 'resolvedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminListBugsQuery extends ListBugsQuery {
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
}

// API Response Types
export interface ListBugsResponse {
  bugs: BugReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminListBugsResponse extends ListBugsResponse {
  bugs: BugReportWithTenant[];
  stats: BugStats;
}

export interface CreateBugResponse {
  bug: BugReport;
}

export interface UpdateBugResponse {
  bug: BugReport;
}

// Attachment API Types
export interface UploadAttachmentResponse {
  attachment: BugAttachment;
}

export interface DownloadAttachmentResponse {
  url: string;
  expiresAt: Date | string;
}

// Comment API Types
export interface CreateCommentRequest {
  content: string;
  isAdminOnly?: boolean;
}

export interface ListCommentsResponse {
  comments: BugComment[];
}

// Auto-captured metadata (not user-editable)
export interface BugMetadata {
  submitterId: string;
  companyId: string;
  pageUrl: string;
  userAgent: string;
  timestamp: Date;
}

// Form data for bug submission modal
export interface BugFormData {
  title: string;
  description: string;
  stepsToReproduce?: string;
  severity: BugSeverity;
  attachments?: File[];
}

// Validation constants
export const BUG_VALIDATION = {
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 5000,
  STEPS_MAX_LENGTH: 3000,
  MAX_ATTACHMENTS: 5,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
  ] as const,
} as const;

// Type guard helpers
export function isBugSeverity(value: string): value is BugSeverity {
  return ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(value);
}

export function isBugStatus(value: string): value is BugStatus {
  return ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'WONT_FIX'].includes(value);
}

// Severity display info
export const SEVERITY_INFO: Record<BugSeverity, { label: string; color: string; bgColor: string }> = {
  CRITICAL: { label: 'Critical', color: 'text-red-700', bgColor: 'bg-red-100' },
  HIGH: { label: 'High', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  LOW: { label: 'Low', color: 'text-blue-700', bgColor: 'bg-blue-100' },
};

// Status display info
export const STATUS_INFO: Record<BugStatus, { label: string; color: string; bgColor: string }> = {
  OPEN: { label: 'Open', color: 'text-red-700', bgColor: 'bg-red-100' },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  RESOLVED: { label: 'Resolved', color: 'text-green-700', bgColor: 'bg-green-100' },
  CLOSED: { label: 'Closed', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  WONT_FIX: { label: "Won't Fix", color: 'text-slate-700', bgColor: 'bg-slate-100' },
};
