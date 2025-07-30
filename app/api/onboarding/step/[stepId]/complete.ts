// /pages/api/onboarding/step/[stepId]/complete.ts

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma"; // Update path if needed
// import supabase if you want to handle file uploads here

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const { stepId } = req.query;
  const { ack, formResponse, fileUrl } = req.body || {};

  try {
    // Find the step instance
    const stepInstance = await prisma.onboardingStepInstance.findUnique({
      where: { id: String(stepId) },
      include: { onboardingInstance: true },
    });

    if (!stepInstance) return res.status(404).json({ error: "Step not found." });

    // Optionally: add company/user checks here for security

    // 1. Mark step as completed
    await prisma.onboardingStepInstance.update({
      where: { id: String(stepId) },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    // 2. Store any responses (ack, form, file)
    // You can create a separate table e.g. onboardingStepResponse for form data
    if (formResponse) {
      await prisma.onboardingStepResponse.create({
        data: {
          onboardingStepInstanceId: String(stepId),
          response: formResponse, // Assuming JSON
        },
      });
    }

    // 3. Log document acknowledgement if needed
    if (ack) {
      await prisma.onboardingStepAck.create({
        data: {
          onboardingStepInstanceId: String(stepId),
          acknowledged: !!ack,
          acknowledgedAt: new Date(),
        },
      });
    }

    // 4. Link file if uploaded (for upload steps)
    if (fileUrl) {
      await prisma.onboardingDocument.create({
        data: {
          onboardingStepInstanceId: String(stepId),
          url: fileUrl,
        },
      });
    }

    // 5. Optionally: Log action to audit table

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
