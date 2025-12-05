import { NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { invalidateDocumentStatusCache } from "@/lib/cache";

// ✅ POST: Acknowledge a document
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { documentId } = await req.json();
    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 },
      );
    }

    // ✅ Fetch employee record for current user
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });
    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 },
      );
    }

    // ✅ Check if already acknowledged
    const existingAck = await prisma.documentAcknowledgement.findFirst({
      where: { documentId, employeeId: employee.id },
    });

    if (existingAck) {
      return NextResponse.json(
        { message: "Already acknowledged" },
        { status: 200 },
      );
    }

    // ✅ Create acknowledgement entry
    await prisma.documentAcknowledgement.create({
      data: {
        id: crypto.randomUUID(),
        documentId,
        employeeId: employee.id,
        acknowledgedAt: new Date(),
      },
    });

    // ✅ Mark related action items as completed
    if (session.user.companyId) {
      await prisma.actionItem.updateMany({
        where: {
          companyId: session.user.companyId,
          assignedToId: session.user.id,
          type: "DOCUMENT_ACKNOWLEDGEMENT",
          status: "PENDING",
          metadata: {
            path: ["documentId"],
            equals: documentId,
          },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }

    // Invalidate document status cache
    if (session.user.companyId) {
      try {
        await invalidateDocumentStatusCache(session.user.companyId, documentId);
      } catch (error) {
        console.warn("[acknowledge] Cache invalidation error:", error);
      }
    }

    return NextResponse.json(
      { message: "Acknowledgement recorded" },
      { status: 200 },
    );
  } catch (error) {
    console.error("❌ Error acknowledging document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
