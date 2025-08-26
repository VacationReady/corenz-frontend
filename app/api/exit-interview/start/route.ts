import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createHash } from "crypto";

const startSchema = z.object({
  token: z.string().min(1),
  offboardingId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, offboardingId } = startSchema.parse(body);

    // Get offboarding record
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

    // Validate token
    const expectedHash = createHash('sha256').update(token + offboardingId).digest('hex');
    if (offboarding.completionTokenHash !== expectedHash) {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
    }

    // Check if already submitted
    if (offboarding.completionStatus === 'SUBMITTED') {
      return NextResponse.json({ error: "Form already submitted" }, { status: 400 });
    }

    // Update completion status to STARTED if it's still PENDING
    if (offboarding.completionStatus === 'PENDING') {
      await prisma.employeeOffboarding.update({
        where: { id: offboardingId },
        data: {
          completionStatus: 'STARTED'
        }
      });
    }

    // Return form template data
    return NextResponse.json({
      success: true,
      formTemplate: offboarding.formTemplate,
      employee: {
        firstName: offboarding.employee.user.firstName,
        lastName: offboarding.employee.user.lastName
      },
      offboardingId: offboarding.id
    });

  } catch (error) {
    console.error('Error starting exit interview form:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Validation error", 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: "Failed to start form" 
    }, { status: 500 });
  }
}
