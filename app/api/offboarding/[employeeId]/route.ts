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
        interviewerUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        formTemplate: {
          select: {
            id: true,
            name: true,
            description: true,
            schemaJson: true
          }
        },
        exitInterviewSubmissions: {
          select: {
            id: true,
            submittedAt: true,
            submittedBy: true,
            answersJson: true,
            template: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            submittedAt: 'desc'
          }
        },
        tasks: {
          include: {
            assignedToUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            completedByUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        }
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
        interviewer: offboarding.interviewerUser ? {
          id: offboarding.interviewerUser.id,
          name: `${offboarding.interviewerUser.firstName} ${offboarding.interviewerUser.lastName}`,
          email: offboarding.interviewerUser.email
        } : {
          name: offboarding.interviewerName,
          email: offboarding.interviewerEmail
        },
        location: offboarding.location,
        notes: offboarding.exitInterviewNotes,
        sendForm: offboarding.sendForm,
        formTemplate: offboarding.formTemplate,
        formTiming: offboarding.formTiming,
        completionStatus: offboarding.completionStatus,
        inviteLastSentAt: offboarding.inviteLastSentAt,
        scheduledSendAt: offboarding.scheduledSendAt
      },
      
      // Form submissions
      formSubmissions: offboarding.exitInterviewSubmissions.map(submission => ({
        id: submission.id,
        templateName: submission.template.name,
        submittedAt: submission.submittedAt,
        submittedBy: submission.submittedBy,
        answersJson: submission.answersJson
      })),
      
      // Tasks
      tasks: offboarding.tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        category: task.category,
        isRequired: task.isRequired,
        assignedTo: task.assignedToUser ? {
          id: task.assignedToUser.id,
          name: `${task.assignedToUser.firstName} ${task.assignedToUser.lastName}`,
          email: task.assignedToUser.email
        } : null,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        completedBy: task.completedByUser ? {
          id: task.completedByUser.id,
          name: `${task.completedByUser.firstName} ${task.completedByUser.lastName}`,
          email: task.completedByUser.email
        } : null,
        notes: task.notes,
        order: task.order
      })),
      
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
    return NextResponse.json({ 
      error: "Failed to fetch offboarding details" 
    }, { status: 500 });
  }
}
