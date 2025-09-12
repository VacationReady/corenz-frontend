import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { z } from "zod";

const AuditLogExportSchema = z.object({
  entityType: z.string().optional(),
  action: z.string().optional(),
  actorId: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  search: z.string().optional(),
});

// GET: Export audit logs as CSV
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const queryParams = Object.fromEntries(url.searchParams);
    const validatedParams = AuditLogExportSchema.parse(queryParams);

    // Build where clause (same as in main route)
    const whereClause: any = {
      companyId: session.user.companyId,
    };

    if (validatedParams.entityType) {
      whereClause.entityType = validatedParams.entityType;
    }

    if (validatedParams.action) {
      whereClause.action = validatedParams.action;
    }

    if (validatedParams.actorId) {
      whereClause.actorId = validatedParams.actorId;
    }

    if (validatedParams.dateFrom || validatedParams.dateTo) {
      whereClause.timestamp = {};
      if (validatedParams.dateFrom) {
        whereClause.timestamp.gte = new Date(validatedParams.dateFrom);
      }
      if (validatedParams.dateTo) {
        whereClause.timestamp.lte = new Date(validatedParams.dateTo);
      }
    }

    if (validatedParams.search) {
      const searchTerm = validatedParams.search.toLowerCase();
      whereClause.OR = [
        { entityId: { contains: searchTerm, mode: "insensitive" } },
        { actor: { email: { contains: searchTerm, mode: "insensitive" } } },
        { actor: { name: { contains: searchTerm, mode: "insensitive" } } },
        { changes: { path: [], string_contains: searchTerm } },
        { metadata: { path: [], string_contains: searchTerm } },
      ];
    }

    // Fetch all matching audit logs (limit to reasonable number for export)
    const logs = await prisma.globalAuditLog.findMany({
      where: whereClause,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 10000, // Limit to 10k records for performance
    });

    // Convert to CSV
    const csvHeaders = [
      "Timestamp",
      "Entity Type",
      "Entity ID",
      "Action",
      "Actor Name",
      "Actor Email",
      "Actor Type",
      "Changes",
      "Metadata",
    ].join(",");

    const csvRows = logs.map((log) =>
      [
        log.timestamp.toISOString(),
        log.entityType,
        log.entityId,
        log.action,
        log.actor?.name || "",
        log.actor?.email || "",
        log.actorType,
        log.changes ? JSON.stringify(log.changes).replace(/"/g, '""') : "",
        log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : "",
      ]
        .map((field) => `"${field}"`)
        .join(","),
    );

    const csvContent = [csvHeaders, ...csvRows].join("\n");

    // Return CSV file
    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("GET /api/audit-logs/export error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid query parameters", details: error.flatten() },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to export audit logs" },
      { status: 500 },
    );
  }
}
