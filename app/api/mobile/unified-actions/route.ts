import { NextRequest, NextResponse } from "next/server";
import { getMobileSession } from "@/lib/mobile-session";
import { prisma } from "@/lib/prisma";

export interface UnifiedActionItem {
  id: string;
  type: 'SURVEY' | 'DOCUMENT_SIGNATURE' | 'DOCUMENT_ACKNOWLEDGEMENT' | 'LEAVE_APPROVAL' | 'TIMESHEET_APPROVAL' | 'CHANGE_REQUEST' | 'TASK' | 'BULK_UPDATE_APPROVAL' | 'EXIT_INTERVIEW_FORM';
  title: string;
  subtitle?: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  dueDate?: string;
  urgent?: boolean;
  metadata?: any;
  actionLabel?: string;
  source: 'action_item' | 'approval' | 'change_request' | 'document';
  createdAt: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getMobileSession(req);
    if (!session?.user?.id || !session.user.companyId) {
      console.error("[unified-actions] Unauthorized: No session or missing user/companyId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = session.user.companyId;
    const userId = session.user.id;
    console.log(`[unified-actions] Fetching action items for user ${userId} in company ${companyId}`);
    const items: UnifiedActionItem[] = [];

    // 1. Fetch action items from database (surveys, timesheets, documents, tasks)
    const actionItems = await prisma.actionItem.findMany({
      where: {
        companyId,
        assignedToId: userId,
        status: 'PENDING',
      },
      include: {
        RelatedEmployee: {
          select: {
            id: true,
            User: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
      take: 50,
    });

    for (const item of actionItems) {
      const metadata = (item.metadata as any) || {};
      const relatedName = item.RelatedEmployee?.User 
        ? `${item.RelatedEmployee.User.firstName || ''} ${item.RelatedEmployee.User.lastName || ''}`.trim()
        : null;

      let actionType = item.type as UnifiedActionItem['type'];
      let subtitle = item.description || '';
      let actionLabel = 'Complete';

      switch (item.type) {
        case 'SURVEY':
          subtitle = metadata.surveyName ? `Survey: ${metadata.surveyName}` : 'Survey';
          actionLabel = 'Complete Survey';
          break;
        case 'TIMESHEET_APPROVAL':
          subtitle = [metadata.label, metadata.totalHours ? `${metadata.totalHours} hours` : ''].filter(Boolean).join(' • ');
          actionLabel = 'Review Timesheet';
          break;
        case 'DOCUMENT_SIGNATURE':
          subtitle = metadata.documentCategory || 'Signature required';
          actionLabel = 'Sign';
          break;
        case 'DOCUMENT_ACKNOWLEDGEMENT':
          subtitle = metadata.documentCategory || 'Acknowledgement required';
          actionLabel = 'Review';
          break;
        case 'EXIT_INTERVIEW_FORM':
          subtitle = 'Exit interview form';
          actionLabel = 'Complete Form';
          break;
        case 'BULK_UPDATE_APPROVAL':
          const changes = metadata.changes || [];
          subtitle = `${changes.length} employees • AI Generated`;
          actionLabel = 'Review';
          break;
        default:
          if (relatedName) {
            subtitle = `For ${relatedName}`;
          }
      }

      items.push({
        id: `action-${item.id}`,
        type: actionType as UnifiedActionItem['type'],
        title: item.title,
        subtitle,
        description: item.description || undefined,
        priority: item.priority as UnifiedActionItem['priority'],
        status: item.status as UnifiedActionItem['status'],
        dueDate: item.dueDate?.toISOString(),
        urgent: item.priority === 'HIGH' || item.priority === 'URGENT' || 
          (item.dueDate ? new Date(item.dueDate) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : false),
        metadata: {
          ...metadata,
          actionItemId: item.id,
        },
        actionLabel,
        source: 'action_item',
        createdAt: item.createdAt.toISOString(),
      });
    }

    // 2. Fetch leave/holiday approvals
    const leaveDecisions = await prisma.leaveApprovalDecision.findMany({
      where: {
        status: 'PENDING',
        isActive: true,
        approverId: userId,
        stage: { leaveRequest: { Company: { id: companyId } } },
      },
      include: {
        stage: {
          include: {
            leaveRequest: { 
              include: { 
                Employee: { include: { User: true } }, 
                EventCategory: true 
              } 
            },
          },
        },
      },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    for (const decision of leaveDecisions) {
      const user = decision.stage.leaveRequest.Employee.User as any;
      const displayName = (user?.name && user.name.trim()) || 
        `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || 
        user?.email || "Employee";
      const leaveType = decision.stage.leaveRequest.EventCategory?.name ?? "Leave";
      const start = new Date(decision.stage.leaveRequest.startDate);
      const end = new Date(decision.stage.leaveRequest.endDate);

      items.push({
        id: `approval-${decision.id}`,
        type: 'LEAVE_APPROVAL',
        title: `${displayName} — ${leaveType}`,
        subtitle: `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
        priority: 'MEDIUM',
        status: 'PENDING',
        urgent: start < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        metadata: {
          decisionId: decision.id,
          leaveRequestId: decision.stage.leaveRequestId,
          employeeId: decision.stage.leaveRequest.employeeId,
          employeeName: displayName,
          employeeProfileImage: user?.profileImageUrl,
          leaveType,
          startDate: decision.stage.leaveRequest.startDate,
          endDate: decision.stage.leaveRequest.endDate,
        },
        actionLabel: 'Review',
        source: 'approval',
        createdAt: decision.createdAt.toISOString(),
      });
    }

    // 3. Fetch transactional change requests (bank/payroll, personal info, etc.)
    try {
      const txnRequests = await (prisma as any).transactionalChangeRequest.findMany({
        where: { 
          companyId, 
          approverIds: { has: userId }, 
          status: 'PENDING' 
        },
        orderBy: { createdAt: 'desc' },
        include: {
          Requester: true,
          Employee: { include: { User: true } },
        },
        take: 50,
      });

      for (const req of txnRequests) {
        const employeeName = req.Employee?.User 
          ? `${req.Employee.User.firstName || ''} ${req.Employee.User.lastName || ''}`.trim() || req.Employee.User.email
          : 'Employee';

        const sectionLabels: Record<string, string> = {
          'bank-payroll': 'Bank & Payroll',
          'personal-info': 'Personal Info',
          'emergency-contacts': 'Emergency Contact',
          'employment-checks': 'Employment Check',
          'driver-licenses': 'Driver License',
          'training': 'Training Record',
        };

        const sectionLabel = sectionLabels[req.section] || req.section;

        items.push({
          id: `change-${req.id}`,
          type: 'CHANGE_REQUEST',
          title: `${sectionLabel} Change Request`,
          subtitle: employeeName,
          priority: 'MEDIUM',
          status: 'PENDING',
          metadata: {
            requestId: req.id,
            section: req.section,
            action: req.action,
            employeeId: req.employeeId,
            employeeName,
            payload: req.payload,
            diffs: req.diffs,
            reasons: req.reasons,
          },
          actionLabel: 'Review',
          source: 'change_request',
          createdAt: req.createdAt.toISOString(),
        });
      }
    } catch (e) {
      // TransactionalChangeRequest model might not exist
      console.log('Transactional change requests not available');
    }

    // 4. Fetch documents requiring acknowledgement or signature
    // Get employee ID for current user
    const employee = await prisma.employee.findFirst({
      where: { userId, companyId },
      select: { id: true },
    });

    if (employee) {
      // Get documents assigned to this employee via SignatureEmployees relation
      // Use type assertion since Prisma types for includes can be complex
      const documents: any[] = await (prisma.document as any).findMany({
        where: {
          companyId,
          OR: [
            { requiresAck: true },
            { requiresSignature: true },
          ],
          SignatureEmployees: {
            some: {
              employeeId: employee.id,
            },
          },
        },
        include: {
          DocumentAcknowledgement: {
            where: { employeeId: employee.id },
          },
          SignatureArtifacts: {
            where: { employeeId: employee.id },
          },
          SignatureFields: true,
        },
        take: 30,
      });

      for (const doc of documents) {
        // Check if already acknowledged
        if (doc.requiresAck && (!doc.DocumentAcknowledgement || doc.DocumentAcknowledgement.length === 0)) {
          // Check if there's already an action item for this document
          const existingActionItem = items.find(
            i => i.source === 'action_item' && 
            i.type === 'DOCUMENT_ACKNOWLEDGEMENT' && 
            i.metadata?.documentId === doc.id
          );
          
          if (!existingActionItem) {
            items.push({
              id: `doc-ack-${doc.id}`,
              type: 'DOCUMENT_ACKNOWLEDGEMENT',
              title: doc.name,
              subtitle: 'Acknowledgement required',
              priority: 'MEDIUM',
              status: 'PENDING',
              dueDate: doc.signatureDueAt?.toISOString(),
              urgent: doc.signatureDueAt ? new Date(doc.signatureDueAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : false,
              metadata: {
                documentId: doc.id,
                documentName: doc.name,
                documentUrl: doc.url,
              },
              actionLabel: 'Review',
              source: 'document',
              createdAt: doc.createdAt.toISOString(),
            });
          }
        }

        // Check if signature required and not yet signed
        const signatureFields = doc.SignatureFields || [];
        const signatures = doc.SignatureArtifacts || [];
        if (doc.requiresSignature && signatures.length === 0 && signatureFields.length > 0) {
          // Check if there's already an action item for this document
          const existingActionItem = items.find(
            i => i.source === 'action_item' && 
            i.type === 'DOCUMENT_SIGNATURE' && 
            i.metadata?.documentId === doc.id
          );
          
          if (!existingActionItem) {
            items.push({
              id: `doc-sign-${doc.id}`,
              type: 'DOCUMENT_SIGNATURE',
              title: doc.name,
              subtitle: 'Signature required',
              priority: 'HIGH',
              status: 'PENDING',
              dueDate: doc.signatureDueAt?.toISOString(),
              urgent: doc.signatureDueAt ? new Date(doc.signatureDueAt) < new Date(Date.now() + 3 * 24 * 60 * 60 * 1000) : true,
              metadata: {
                documentId: doc.id,
                documentName: doc.name,
                documentUrl: doc.url,
                hasSignatureFields: signatureFields.length > 0,
              },
              actionLabel: 'Sign',
              source: 'document',
              createdAt: doc.createdAt.toISOString(),
            });
          }
        }
      }
    }

    // Sort all items: urgent first, then by priority, then by date
    items.sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      
      const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      const aPriority = priorityOrder[a.priority] ?? 4;
      const bPriority = priorityOrder[b.priority] ?? 4;
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({
      success: true,
      data: items,
      counts: {
        total: items.length,
        surveys: items.filter(i => i.type === 'SURVEY').length,
        approvals: items.filter(i => i.type === 'LEAVE_APPROVAL').length,
        timesheets: items.filter(i => i.type === 'TIMESHEET_APPROVAL').length,
        documents: items.filter(i => i.type === 'DOCUMENT_SIGNATURE' || i.type === 'DOCUMENT_ACKNOWLEDGEMENT').length,
        changeRequests: items.filter(i => i.type === 'CHANGE_REQUEST').length,
        tasks: items.filter(i => i.type === 'TASK').length,
      },
    });
  } catch (error) {
    console.error("[unified-actions] Failed to fetch unified action items:", error);
    console.error("[unified-actions] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    console.error("[unified-actions] Error message:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to fetch action items", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
