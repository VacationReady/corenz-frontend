import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { employeeId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin/manager role
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { employeeId } = params;

    // Get offboarding record with all related data
    const offboarding = await prisma.employeeOffboarding.findUnique({
      where: { employeeId },
      include: {
        employee: {
          include: {
            user: true,
            department: true,
            jobRole: true
          }
        },
        initiatedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
      }
    });

    if (!offboarding) {
      return NextResponse.json({ error: "Offboarding record not found" }, { status: 404 });
    }

    // Format the response
    const response = {
      id: offboarding.id,
      status: offboarding.status,
      initiatedAt: offboarding.initiatedAt,
      completedAt: offboarding.completedAt,

      // Employee details
      employee: {
        id: offboarding.employee.id,
        firstName: offboarding.employee.user.firstName,
        lastName: offboarding.employee.user.lastName,
        email: offboarding.employee.user.email,
        department: offboarding.employee.department?.name,
        jobRole: offboarding.employee.jobRole?.name,
        isActive: offboarding.employee.isActive
      },

      // Initiated by
      initiatedBy: {
        id: offboarding.initiatedBy.id,
        name: `${offboarding.initiatedBy.firstName} ${offboarding.initiatedBy.lastName}`,
        email: offboarding.initiatedBy.email
      },

      // Exit interview details
      exitInterview: {
        date: offboarding.exitInterviewDate,
        endTime: offboarding.exitInterviewEnd,
        interviewer: offboarding.interviewerUserId ? {
          id: offboarding.interviewerUserId,
          name: offboarding.interviewerName || 'Unknown',
          email: offboarding.interviewerEmail || ''
        } : {
          name: offboarding.interviewerName || 'Not assigned',
          email: offboarding.interviewerEmail || ''
        },
        location: offboarding.location,
        notes: offboarding.exitInterviewNotes,
        sendForm: offboarding.sendForm,
        formTemplate: null, // Will be populated if needed
        formTiming: offboarding.formTiming,
        completionStatus: offboarding.completionStatus,
        inviteLastSentAt: offboarding.inviteLastSentAt,
        scheduledSendAt: offboarding.scheduledSendAt
      },

      // Form submissions (empty for now)
      formSubmissions: [],

      // Tasks (empty for now)
      tasks: [],
      
      // Other offboarding details
      lastWorkingDate: offboarding.lastWorkingDate,
      offboardingType: offboarding.offboardingType,
      offboardingReason: offboarding.offboardingReason,
      isVoluntary: offboarding.isVoluntary,
      noticePeriodDays: offboarding.noticePeriodDays,
      resignationDate: offboarding.resignationDate,
      
      // Access management
      removeAccessImmediately: offboarding.removeAccessImmediately,
      accessRemovedAt: offboarding.accessRemovedAt,
      accessRemovedBy: offboarding.accessRemovedBy,
      
      // Asset management
      assetsToReturn: offboarding.assetsToReturn,
      assetsReturned: offboarding.assetsReturned,
      assetsReturnedAt: offboarding.assetsReturnedAt,
      
      // Knowledge transfer
      handoverRequired: offboarding.handoverRequired,
      handoverAssignedTo: offboarding.handoverAssignedTo,
      handoverCompleted: offboarding.handoverCompleted,
      handoverCompletedAt: offboarding.handoverCompletedAt,
      handoverNotes: offboarding.handoverNotes,
      
      // Final pay & benefits
      finalPayCalculated: offboarding.finalPayCalculated,
      finalPayAmount: offboarding.finalPayAmount,
      unusedLeaveHours: offboarding.unusedLeaveHours,
      unusedLeavePayment: offboarding.unusedLeavePayment,
      benefitsEndDate: offboarding.benefitsEndDate,
      
      // Administrative
      hrReviewRequired: offboarding.hrReviewRequired,
      hrReviewCompleted: offboarding.hrReviewCompleted,
      hrReviewCompletedBy: offboarding.hrReviewCompletedBy,
      hrReviewCompletedAt: offboarding.hrReviewCompletedAt,
      hrNotes: offboarding.hrNotes,
      
      // References & documentation
      referenceContactAllowed: offboarding.referenceContactAllowed,
      documentationArchived: offboarding.documentationArchived,
      complianceCheckCompleted: offboarding.complianceCheckCompleted,
      
      createdAt: offboarding.createdAt,
      updatedAt: offboarding.updatedAt
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching offboarding details:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({
      error: "Failed to fetch offboarding details",
      details: error.message
    }, { status: 500 });
  }
}
