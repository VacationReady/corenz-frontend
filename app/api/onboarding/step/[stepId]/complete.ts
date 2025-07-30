// app/api/onboarding/step/[stepId]/complete/route.ts

import { NextRequest, NextResponse } from "next/server";
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
  { params }: { params: { stepId: string } }
) {
  const { stepId } = params;
  const body = await parseBody(request);

  // Optionally: validate user/company context here (auth/session)
  // const session = await getServerSession(...)

  try {
    // 1. Find step instance (and onboardingInstance, employee, company for security)
    const stepInstance = await prisma.onboardingStepInstance.findUnique({
  where: { id: stepId },
  include: {
    onboardingInstance: {
      include: {
        employee: {
          include: {
            user: true, // This gets you employee.user.companyId
          }
        }
      }
    },
    step: true,
  },
});

    if (!stepInstance) {
      return NextResponse.json({ error: "Step not found." }, { status: 404 });
    }

    // Optionally: Ensure only assigned employee can complete this step!
    // e.g. check session.user.id === stepInstance.onboardingInstance.employee.userId

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
    name: body.fileName || "Uploaded Document",
    url: body.fileUrl,
    path: body.filePath || body.fileUrl, // fallback if you don't store path separately
    size: body.fileSize || 0,            // set actual file size
    type: body.fileType || "other",
    employeeId: stepInstance.onboardingInstance.employeeId,
    uploaderId: stepInstance.onboardingInstance.employee.userId,
    companyId: stepInstance.onboardingInstance.employee.companyId,
    // Add category/description as needed
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
