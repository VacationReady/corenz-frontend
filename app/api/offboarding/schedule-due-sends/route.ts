import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendExitInterviewFormInvite } from "@/lib/email/send";
import { isTodayInLondon } from "@/lib/time";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { offboardingId } = body;

    // If specific offboardingId is provided, handle single case
    if (offboardingId) {
      const offboarding = await prisma.employeeOffboarding.findUnique({
        where: { id: offboardingId },
        include: {
          employee: {
            include: { user: true }
          },
          formTemplate: true
        }
      });

      if (!offboarding) {
        return NextResponse.json({ error: "Offboarding record not found" }, { status: 404 });
      }

      if (!offboarding.sendForm) {
        return NextResponse.json({ error: "This offboarding is not configured for form invitations" }, { status: 400 });
      }

      if (offboarding.completionStatus === 'SUBMITTED') {
        return NextResponse.json({ error: "Form has already been submitted" }, { status: 400 });
      }

      if (offboarding.formTiming !== 'ON_DATE' && offboarding.formTiming !== 'NOW') {
        return NextResponse.json({ error: "This offboarding is not configured for form invitations" }, { status: 400 });
      }

      // Send the form invitation (supports manual resend for NOW forms)
      const emailSent = await sendExitInterviewFormInvite(offboarding.id);

      return NextResponse.json({
        success: true,
        offboardingId: offboarding.id,
        employeeName: `${offboarding.employee.user.firstName} ${offboarding.employee.user.lastName}`,
        emailSent
      });
    }

    // Otherwise, handle cron job case (all due offboardings)
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find offboarding records that need form invitations sent
    const dueOffboardings = await prisma.employeeOffboarding.findMany({
      where: {
        sendForm: true,
        formTiming: 'ON_DATE',
        completionStatus: 'PENDING',
        // Only send if scheduled for today (in London timezone)
        scheduledSendAt: {
          not: null,
          gte: new Date(new Date().setHours(0, 0, 0, 0)), // Start of today UTC
          lt: new Date(new Date().setHours(23, 59, 59, 999)) // End of today UTC
        }
      },
      include: {
        employee: {
          include: { user: true }
        },
        formTemplate: true
      }
    });

    const results = [];

    for (const offboarding of dueOffboardings) {
      try {
        // Double-check it's today in London timezone
        if (!isTodayInLondon(offboarding.scheduledSendAt!)) {
          continue;
        }

        // Send the form invitation
        const emailSent = await sendExitInterviewFormInvite(offboarding.id);

        results.push({
          offboardingId: offboarding.id,
          employeeName: `${offboarding.employee.user.firstName} ${offboarding.employee.user.lastName}`,
          scheduledFor: offboarding.scheduledSendAt,
          emailSent,
          success: emailSent
        });

        console.log(`Sent form invitation for offboarding ${offboarding.id} to ${offboarding.employee.user.email}`);

      } catch (error) {
        console.error(`Failed to send form invitation for offboarding ${offboarding.id}:`, error);
        
        results.push({
          offboardingId: offboarding.id,
          employeeName: `${offboarding.employee.user.firstName} ${offboarding.employee.user.lastName}`,
          scheduledFor: offboarding.scheduledSendAt,
          emailSent: false,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      processed: dueOffboardings.length,
      results
    });

  } catch (error) {
    console.error('Error processing scheduled sends:', error);
    return NextResponse.json({ 
      error: "Failed to process scheduled sends" 
    }, { status: 500 });
  }
}

// Also support GET for manual testing
export async function GET(req: NextRequest) {
  try {
    // For manual testing, allow without auth header
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Count due offboardings without sending
    const dueCount = await prisma.employeeOffboarding.count({
      where: {
        sendForm: true,
        formTiming: 'ON_DATE',
        scheduledSendAt: {
          not: null,
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999))
        },
        completionStatus: 'PENDING'
      }
    });

    return NextResponse.json({
      success: true,
      dueCount,
      message: `Found ${dueCount} offboarding records due for form invitations today`
    });

  } catch (error) {
    console.error('Error checking scheduled sends:', error);
    return NextResponse.json({ 
      error: "Failed to check scheduled sends" 
    }, { status: 500 });
  }
}
