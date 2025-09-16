import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { sendExitInterviewFormInvite } from "@/lib/email/send";

const sendFormInviteSchema = z.object({
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
    const { offboardingId } = sendFormInviteSchema.parse(body);

    // Get offboarding record
    const offboarding = await prisma.employeeOffboarding.findUnique({
      where: { id: offboardingId },
      include: {
        Employee: {
          include: { User: true },
        },
        formTemplate: true,
      },
    });

    if (!offboarding) {
      return NextResponse.json(
        { error: "Offboarding record not found" },
        { status: 404 },
      );
    }

    if (!offboarding.sendForm) {
      return NextResponse.json(
        { error: "This offboarding is not configured for form invitations" },
        { status: 400 },
      );
    }

    if (offboarding.completionStatus === "SUBMITTED") {
      return NextResponse.json(
        { error: "Form has already been submitted" },
        { status: 400 },
      );
    }

    if (offboarding.formTiming !== "NOW") {
      return NextResponse.json(
        { error: "Manual form sending only works for NOW timing" },
        { status: 400 },
      );
    }

    console.log("Sending form invitation for offboarding:", offboarding.id);

    // Send the form invitation
    const emailSent = await sendExitInterviewFormInvite(offboarding.id);

    console.log("Form invitation result:", emailSent);

    if (!emailSent) {
      console.error("Form invitation failed for offboarding:", offboarding.id);
      return NextResponse.json(
        { error: "Failed to send form invitation" },
        { status: 500 },
      );
    }

    console.log(
      "Form invitation sent successfully for offboarding:",
      offboarding.id,
    );

    return NextResponse.json({
      success: true,
      message: "Exit interview form invitation sent successfully",
    });
  } catch (error) {
    console.error("Error sending form invite:", error);

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
        error: "Failed to send form invite",
      },
      { status: 500 },
    );
  }
}

