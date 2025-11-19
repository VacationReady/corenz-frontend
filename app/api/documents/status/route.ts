import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/documents/status
 * 
 * Batched endpoint to retrieve acknowledgement and signature status for multiple documents.
 * Accepts an array of document IDs and returns their status for the current user.
 * 
 * Request body:
 * {
 *   documentIds: string[]
 * }
 * 
 * Response:
 * {
 *   statuses: {
 *     [documentId: string]: {
 *       acknowledged: boolean;
 *       signed: boolean;
 *       requiresAck: boolean;
 *       requiresSignature: boolean;
 *     }
 *   }
 * }
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body = await req.json();
    const { documentIds } = body;

    if (!Array.isArray(documentIds)) {
      return NextResponse.json(
        { error: "documentIds must be an array" },
        { status: 400 }
      );
    }

    if (documentIds.length === 0) {
      return NextResponse.json({ statuses: {} });
    }

    // Limit batch size to prevent abuse
    if (documentIds.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 document IDs per request" },
        { status: 400 }
      );
    }

    // 3. Get employee record for current user
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 }
      );
    }

    // 4. Fetch documents with their requirements (tenant-scoped)
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds },
        companyId: session.user.companyId, // ✅ Multi-tenant isolation
        deletedAt: null,
      },
      select: {
        id: true,
        requiresAck: true,
        requiresSignature: true,
      },
    });

    // Create a map for quick lookup
    const documentMap = new Map(
      documents.map((doc) => [doc.id, doc])
    );

    // 5. Batch fetch acknowledgements for all documents
    const acknowledgements = await prisma.documentAcknowledgement.findMany({
      where: {
        documentId: { in: documentIds },
        employeeId: employee.id,
      },
      select: {
        documentId: true,
      },
    });

    const acknowledgedSet = new Set(
      acknowledgements.map((ack) => ack.documentId)
    );

    // 6. Batch fetch signatures for all documents
    const signatures = await prisma.documentSignatureArtifact.findMany({
      where: {
        documentId: { in: documentIds },
        employeeId: employee.id,
      },
      select: {
        documentId: true,
      },
    });

    const signedSet = new Set(
      signatures.map((sig) => sig.documentId)
    );

    // 7. Build response object
    const statuses: Record<string, {
      acknowledged: boolean;
      signed: boolean;
      requiresAck: boolean;
      requiresSignature: boolean;
    }> = {};

    for (const docId of documentIds) {
      const doc = documentMap.get(docId);
      
      if (!doc) {
        // Document not found or not accessible (wrong tenant, deleted, etc.)
        statuses[docId] = {
          acknowledged: false,
          signed: false,
          requiresAck: false,
          requiresSignature: false,
        };
        continue;
      }

      statuses[docId] = {
        acknowledged: acknowledgedSet.has(docId),
        signed: signedSet.has(docId),
        requiresAck: doc.requiresAck,
        requiresSignature: doc.requiresSignature,
      };
    }

    return NextResponse.json({ statuses });

  } catch (error) {
    console.error("[documents-status-post]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
