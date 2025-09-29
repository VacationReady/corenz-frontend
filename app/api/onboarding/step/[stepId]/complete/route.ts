// app/api/onboarding/step/[stepId]/complete/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// Util: Parse JSON body (works for Next.js App Router POST)
async function parseBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function POST(
  request: NextRequest,
  context: any,
) {
  const rawParams = context?.params;
  const { stepId } = rawParams?.then ? await rawParams : rawParams;
  const body = await parseBody(request);

  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Find step instance (and onboardingInstance, employee, company for security)
    const stepInstance = await prisma.onboardingStepInstance.findUnique({
      where: { id: stepId },
      include: {
        OnboardingInstance: {
          include: {
            Employee: {
              include: {
                User: true, // This gets you employee.user.companyId
              },
            },
          },
        },
        OnboardingStep: true,
      },
    });

    if (!stepInstance) {
      return NextResponse.json({ error: "Step not found." }, { status: 404 });
    }

    const onboardingEmployee = stepInstance.OnboardingInstance?.Employee;
    const onboardingUser = onboardingEmployee?.User;

    if (!onboardingEmployee || !onboardingUser) {
      return NextResponse.json({ error: "Step not accessible." }, { status: 404 });
    }

    if (onboardingUser.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedRoles = new Set(["ADMIN", "MANAGER", "SUPER_ADMIN"]);

    if (
      session.user.id !== onboardingUser.id &&
      !allowedRoles.has(session.user.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Mark step as completed
    await prisma.onboardingStepInstance.update({
      where: { id: stepId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    // 3. Save step response (form data, if present)
    if (body.formResponse) {
      await prisma.onboardingStepResponse.create({
        data: {
          id: `response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          onboardingStepInstanceId: stepId,
          response: body.formResponse, // must be JSON-serializable
        },
      });
    }

    // 4. (Optional) Handle uploaded file - link to Document table if you have fileUrl
    if (body.fileUrl) {
      // You already have Document model; insert a new document and associate it to this step
      await prisma.document.create({
        data: {
          id: `document_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: body.fileName || "Uploaded Document",
          url: body.fileUrl,
          path: body.filePath || body.fileUrl,
          size: body.fileSize || 0,
          type: body.fileType || "other",
          employeeId: onboardingEmployee.id,
          uploaderId: session.user.id,
          companyId: session.user.companyId, // use validated tenant context
          // ...other fields
        },
      });
    }

    // 5. (Optional) Log to audit table here

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error completing onboarding step:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
