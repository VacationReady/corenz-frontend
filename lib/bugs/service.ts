/**
 * Bug Reporting Service
 * 
 * Provides CRUD operations for bug reports with tenant isolation,
 * input validation, and audit logging.
 * 
 * Requirements: 4.8, 5.3, 6.2, 8.5, 9.1, 9.4
 */

import "server-only";

import { prisma } from "../../app/lib/prisma";
import { AuditEntityType, AuditAction, AuditActorType, BugStatus, BugSeverity } from "@prisma/client";
import { randomUUID } from "crypto";
import type {
  BugReport,
  BugReportWithTenant,
  BugStats,
  CreateBugRequest,
  UpdateBugRequest,
  ListBugsQuery,
  AdminListBugsQuery,
} from "../../app/types/bugs";

// ============================================
// TYPES
// ============================================

export interface CreateBugParams extends CreateBugRequest {
  submitterId: string;
  companyId: string;
  pageUrl: string;
  userAgent: string;
}

export interface ListBugsResult {
  bugs: BugReport[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminListBugsResult extends ListBugsResult {
  bugs: BugReportWithTenant[];
  stats: BugStats;
}

export interface UpdateBugParams {
  bugId: string;
  status?: BugStatus;
  adminNotes?: string;
  actorId: string;
}

// ============================================
// BUG SERVICE
// ============================================

/**
 * Create a new bug report
 * 
 * Enforces tenant isolation by setting companyId from the authenticated user's session.
 * Requirements: 4.8, 9.1
 * 
 * @param params - Bug creation parameters
 * @returns The created bug report
 */
export async function createBug(params: CreateBugParams): Promise<BugReport> {
  const { title, description, stepsToReproduce, severity, submitterId, companyId, pageUrl, userAgent } = params;

  const bug = await prisma.bugReport.create({
    data: {
      title,
      description,
      stepsToReproduce,
      severity,
      status: "OPEN",
      submitterId,
      companyId,
      pageUrl,
      userAgent,
    },
    include: {
      Submitter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      Company: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          Comments: true,
          Attachments: true,
        },
      },
    },
  });

  return mapBugReportToResponse(bug);
}

/**
 * Get a bug report by ID with tenant isolation check
 * 
 * Requirements: 5.3, 6.2, 9.1, 9.2
 * 
 * @param bugId - The bug report ID
 * @param companyId - The user's company ID for tenant isolation
 * @param includeAdminNotes - Whether to include admin notes (for tenant admins)
 * @returns The bug report or null if not found/not authorized
 */
export async function getBugById(
  bugId: string,
  companyId: string,
  includeAdminNotes: boolean = false
): Promise<BugReport | null> {
  const bug = await prisma.bugReport.findFirst({
    where: {
      id: bugId,
      companyId, // Tenant isolation
    },
    include: {
      Submitter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      Company: {
        select: {
          id: true,
          name: true,
        },
      },
      Attachments: true,
      Comments: {
        where: includeAdminNotes ? {} : { isAdminOnly: false },
        include: {
          Author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          Comments: true,
          Attachments: true,
        },
      },
    },
  });

  if (!bug) {
    return null;
  }

  return mapBugReportToResponse(bug, includeAdminNotes);
}

/**
 * Get a bug report by ID for tenant admin (no tenant isolation)
 * 
 * Requirements: 8.5
 * 
 * @param bugId - The bug report ID
 * @returns The bug report or null if not found
 */
export async function getBugByIdForAdmin(bugId: string): Promise<BugReportWithTenant | null> {
  const bug = await prisma.bugReport.findUnique({
    where: { id: bugId },
    include: {
      Submitter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      Company: {
        select: {
          id: true,
          name: true,
        },
      },
      Attachments: true,
      Comments: {
        include: {
          Author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: {
          Comments: true,
          Attachments: true,
        },
      },
    },
  });

  if (!bug) {
    return null;
  }

  return mapBugReportToResponse(bug, true) as BugReportWithTenant;
}

/**
 * List bug reports for a tenant with filtering, sorting, and pagination
 * 
 * Requirements: 5.3, 6.2, 9.1
 * 
 * @param companyId - The tenant's company ID
 * @param query - Query parameters for filtering, sorting, pagination
 * @param includeAdminNotes - Whether to include admin notes
 * @returns Paginated list of bug reports
 */
export async function listBugsForTenant(
  companyId: string,
  query: ListBugsQuery = {},
  includeAdminNotes: boolean = false
): Promise<ListBugsResult> {
  const {
    status,
    severity,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  // Build where clause with tenant isolation
  const where: any = { companyId };
  
  if (status) {
    where.status = status;
  }
  
  if (severity) {
    where.severity = severity;
  }

  // Build order by clause
  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  // Get total count
  const total = await prisma.bugReport.count({ where });

  // Get paginated results
  const bugs = await prisma.bugReport.findMany({
    where,
    include: {
      Submitter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      Company: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          Comments: true,
          Attachments: true,
        },
      },
    },
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
  });

  return {
    bugs: bugs.map((bug) => mapBugReportToResponse(bug, includeAdminNotes)),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}


/**
 * List all bug reports across all tenants (for tenant admin)
 * 
 * Requirements: 8.5
 * 
 * @param query - Query parameters for filtering, sorting, pagination
 * @returns Paginated list of bug reports with statistics
 */
export async function listAllBugs(query: AdminListBugsQuery = {}): Promise<AdminListBugsResult> {
  const {
    companyId,
    status,
    severity,
    dateFrom,
    dateTo,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = query;

  // Build where clause
  const where: any = {};
  
  if (companyId) {
    where.companyId = companyId;
  }
  
  if (status) {
    where.status = status;
  }
  
  if (severity) {
    where.severity = severity;
  }
  
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo);
    }
  }

  // Build order by clause
  const orderBy: any = {};
  orderBy[sortBy] = sortOrder;

  // Get total count
  const total = await prisma.bugReport.count({ where });

  // Get paginated results
  const bugs = await prisma.bugReport.findMany({
    where,
    include: {
      Submitter: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      Company: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          Comments: true,
          Attachments: true,
        },
      },
    },
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
  });

  // Calculate statistics
  const stats = await calculateBugStats(where.companyId);

  return {
    bugs: bugs.map((bug) => mapBugReportToResponse(bug, true) as BugReportWithTenant),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    stats,
  };
}

/**
 * Update bug status and/or admin notes with audit logging
 * 
 * Requirements: 8.5, 9.4
 * 
 * @param params - Update parameters
 * @returns The updated bug report
 */
export async function updateBugStatus(params: UpdateBugParams): Promise<BugReport> {
  const { bugId, status, adminNotes, actorId } = params;

  // Get current bug state for audit logging
  const currentBug = await prisma.bugReport.findUnique({
    where: { id: bugId },
    select: { status: true, adminNotes: true, companyId: true },
  });

  if (!currentBug) {
    throw new Error(`Bug report ${bugId} not found`);
  }

  // Build update data
  const updateData: any = {};
  const changes: any = {};

  if (status !== undefined && status !== currentBug.status) {
    updateData.status = status;
    changes.status = { from: currentBug.status, to: status };

    // Auto-set resolvedAt when status changes to RESOLVED or CLOSED
    if ((status === "RESOLVED" || status === "CLOSED")) {
      // Check if resolvedAt is not already set
      const bugWithResolvedAt = await prisma.bugReport.findUnique({
        where: { id: bugId },
        select: { resolvedAt: true },
      });
      
      if (!bugWithResolvedAt?.resolvedAt) {
        updateData.resolvedAt = new Date();
        changes.resolvedAt = { from: null, to: updateData.resolvedAt };
      }
    }
  }

  if (adminNotes !== undefined && adminNotes !== currentBug.adminNotes) {
    updateData.adminNotes = adminNotes;
    changes.adminNotes = { from: currentBug.adminNotes, to: adminNotes };
  }

  // If no changes, return current bug
  if (Object.keys(updateData).length === 0) {
    const bug = await prisma.bugReport.findUnique({
      where: { id: bugId },
      include: {
        Submitter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            Comments: true,
            Attachments: true,
          },
        },
      },
    });
    return mapBugReportToResponse(bug!, true);
  }

  // Update bug and create audit log in a transaction
  const [updatedBug] = await prisma.$transaction([
    prisma.bugReport.update({
      where: { id: bugId },
      data: updateData,
      include: {
        Submitter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            Comments: true,
            Attachments: true,
          },
        },
      },
    }),
    // Create audit log entry (Requirement 9.4)
    prisma.globalAuditLog.create({
      data: {
        id: randomUUID(),
        companyId: currentBug.companyId,
        entityType: AuditEntityType.BUG_REPORT,
        entityId: bugId,
        action: AuditAction.UPDATED,
        actorId,
        actorType: AuditActorType.USER,
        changes,
        metadata: {
          source: "tenant-admin",
        },
      },
    }),
  ]);

  return mapBugReportToResponse(updatedBug, true);
}

/**
 * Calculate bug statistics
 * 
 * @param companyId - Optional company ID to filter stats
 * @returns Bug statistics
 */
async function calculateBugStats(companyId?: string): Promise<BugStats> {
  const where = companyId ? { companyId } : {};

  // Get counts by status
  const statusCounts = await prisma.bugReport.groupBy({
    by: ["status"],
    where,
    _count: { status: true },
  });

  // Get counts by severity
  const severityCounts = await prisma.bugReport.groupBy({
    by: ["severity"],
    where,
    _count: { severity: true },
  });

  // Get counts by tenant
  const tenantCounts = await prisma.bugReport.groupBy({
    by: ["companyId"],
    where,
    _count: { companyId: true },
  });

  // Get company names for tenant counts
  const companyIds = tenantCounts.map((t) => t.companyId);
  const companies = await prisma.company.findMany({
    where: { id: { in: companyIds } },
    select: { id: true, name: true },
  });
  const companyMap = new Map(companies.map((c) => [c.id, c.name]));

  // Build stats object
  const stats: BugStats = {
    total: statusCounts.reduce((sum, s) => sum + s._count.status, 0),
    open: statusCounts.find((s) => s.status === "OPEN")?._count.status || 0,
    inProgress: statusCounts.find((s) => s.status === "IN_PROGRESS")?._count.status || 0,
    resolved: statusCounts.find((s) => s.status === "RESOLVED")?._count.status || 0,
    closed: statusCounts.find((s) => s.status === "CLOSED")?._count.status || 0,
    wontFix: statusCounts.find((s) => s.status === "WONT_FIX")?._count.status || 0,
    bySeverity: {
      CRITICAL: severityCounts.find((s) => s.severity === "CRITICAL")?._count.severity || 0,
      HIGH: severityCounts.find((s) => s.severity === "HIGH")?._count.severity || 0,
      MEDIUM: severityCounts.find((s) => s.severity === "MEDIUM")?._count.severity || 0,
      LOW: severityCounts.find((s) => s.severity === "LOW")?._count.severity || 0,
    },
    byTenant: tenantCounts.map((t) => ({
      companyId: t.companyId,
      companyName: companyMap.get(t.companyId) || "Unknown",
      count: t._count.companyId,
    })),
  };

  return stats;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Map Prisma bug report to API response format
 */
function mapBugReportToResponse(bug: any, includeAdminNotes: boolean = false): BugReport {
  const response: BugReport = {
    id: bug.id,
    title: bug.title,
    description: bug.description,
    stepsToReproduce: bug.stepsToReproduce,
    severity: bug.severity,
    status: bug.status,
    pageUrl: bug.pageUrl,
    userAgent: bug.userAgent,
    resolvedAt: bug.resolvedAt,
    createdAt: bug.createdAt,
    updatedAt: bug.updatedAt,
    submitterId: bug.submitterId,
    companyId: bug.companyId,
  };

  // Only include adminNotes for tenant admins
  if (includeAdminNotes) {
    response.adminNotes = bug.adminNotes;
  }

  // Include related data if present
  if (bug.Submitter) {
    response.submitter = {
      id: bug.Submitter.id,
      name: bug.Submitter.name,
      email: bug.Submitter.email,
    };
  }

  if (bug.Company) {
    response.company = {
      id: bug.Company.id,
      name: bug.Company.name,
    };
  }

  if (bug.Attachments) {
    response.attachments = bug.Attachments.map((a: any) => ({
      id: a.id,
      bugReportId: a.bugReportId,
      fileName: a.fileName,
      fileSize: a.fileSize,
      mimeType: a.mimeType,
      storagePath: a.storagePath,
      createdAt: a.createdAt,
    }));
  }

  if (bug.Comments) {
    response.comments = bug.Comments.map((c: any) => ({
      id: c.id,
      bugReportId: c.bugReportId,
      authorId: c.authorId,
      content: c.content,
      isAdminOnly: c.isAdminOnly,
      createdAt: c.createdAt,
      author: c.Author
        ? {
            id: c.Author.id,
            name: c.Author.name,
            email: c.Author.email,
          }
        : undefined,
    }));
  }

  if (bug._count) {
    response._count = {
      comments: bug._count.Comments,
      attachments: bug._count.Attachments,
    };
  }

  return response;
}
