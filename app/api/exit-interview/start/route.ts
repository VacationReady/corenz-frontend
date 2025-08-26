import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// Accept the token from the form link and locate the offboarding record
// based on the stored completionTokenHash. No offboardingId is required
// from the client as it can be derived from the lookup.
const startSchema = z.object({
  token: z.string().min(1)
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = startSchema.parse(body);

    // Find the offboarding record by its completion token
    const offboarding = await prisma.employeeOffboarding.findFirst({
      where: { completionTokenHash: token },
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

    // Check if already submitted
    if (offboarding.completionStatus === 'SUBMITTED') {
      return NextResponse.json({ error: "Form already submitted" }, { status: 400 });
    }

    // Update completion status to STARTED if it's still PENDING
    if (offboarding.completionStatus === 'PENDING') {
      await prisma.employeeOffboarding.update({
        where: { id: offboarding.id },
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
