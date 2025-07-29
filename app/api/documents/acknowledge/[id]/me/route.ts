import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ acknowledged: false });
    }

    // Find the employee record linked to the logged-in user
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ acknowledged: false });
    }

    // Check if acknowledgement exists
    const ack = await prisma.documentAcknowledgement.findUnique({
      where: {
        documentId_employeeId: {
          documentId: params.id,
          employeeId: employee.id,
        },
      },
    });

    if (ack) {
      return NextResponse.json({
        acknowledged: true,
        acknowledgedAt: ack.acknowledgedAt,
      });
    } else {
      return NextResponse.json({ acknowledged: false });
    }
  } catch (error) {
    console.error("Acknowledgement Check Error:", error);
    return NextResponse.json({ acknowledged: false });
  }
}
