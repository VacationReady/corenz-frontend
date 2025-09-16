import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendExitInterviewConfirmation } from "@/lib/email/send";

const sendInvitesSchema = z.object({
  offboardingId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin/manager role
    if (!["ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { offboardingId } = sendInvitesSchema.parse(body);

    // Get offboarding record
    const offboarding = await prisma.employeeOffboarding.findUnique({
      where: { id: offboardingId },
      include: {
        Employee: {
          include: { User: true },
        },
        interviewerUser: true,
      },
    });

    if (!offboarding) {
      return NextResponse.json(
        { error: "Offboarding record not found" },
        { status: 404 },
      );
    }

    if (!offboarding.exitInterviewDate) {
      return NextResponse.json(
        { error: "Exit interview date not set" },
        { status: 400 },
      );
    }

    console.log(
      "About to send exit interview confirmation email for offboarding:",
      offboardingId,
    );

    // Send confirmation email
    const emailSent = await sendExitInterviewConfirmation(offboardingId);

    console.log("Email sending result:", emailSent);

    if (!emailSent) {
      console.error("Email sending failed for offboarding:", offboardingId);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 },
      );
    }

    console.log("Email sent successfully for offboarding:", offboardingId);

    return NextResponse.json({
      success: true,
      message: "Exit interview confirmation sent successfully",
    });
  } catch (error) {
    console.error("Error sending invites:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Validation error",
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Failed to send invites",
      },
      { status: 500 },
    );
  }
}

