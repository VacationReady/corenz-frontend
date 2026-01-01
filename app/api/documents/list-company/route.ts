export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import supabase from "@/lib/supabase-admin";
import { documentStatusCache } from "@/lib/cache";

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const json = Buffer.from(cursor, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as { createdAt?: string; id?: string };
    if (!parsed?.createdAt || !parsed?.id) return null;
    const createdAt = new Date(parsed.createdAt);
    if (Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function encodeCursor(createdAt: Date, id: string): string {
  const json = JSON.stringify({ createdAt: createdAt.toISOString(), id });
  return Buffer.from(json, "utf8").toString("base64url");
}

async function getCachedSignedUrl(
  companyId: string,
  path: string,
  expiresInSeconds: number,
): Promise<string | null> {
  const key = `doc-signed-url:${companyId}:${path}`;
  const cached = await documentStatusCache.get<{ url: string }>(key);
  if (cached?.url) return cached.url;

  const { data: signed } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, expiresInSeconds);
  const url = signed?.signedUrl ?? null;
  if (url) {
    const ttl = Math.max(1, Math.min(expiresInSeconds - 30, expiresInSeconds));
    await documentStatusCache.set(key, { url }, ttl);
  }
  return url;
}

export async function GET(req: Request) {
  const totalStart = performance.now();
  const session = await auth();
  if (!session || !session.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");

  const limitParam = searchParams.get("limit");
  const limit = limitParam
    ? Math.min(Math.max(Number.parseInt(limitParam, 10) || 0, 1), 200)
    : 50;

  const cursorParam = searchParams.get("cursor");
  const cursor = cursorParam ? decodeCursor(cursorParam) : null;

  const requiresActionParam = searchParams.get("requiresAction");
  const requiresAction = requiresActionParam === "1" || requiresActionParam === "true";

  // Fetch user details for filtering
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { departmentId: true, jobRoleId: true, role: true, Employee: { select: { id: true } } },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const sessionEmployeeId = user.Employee?.id ?? (session.user as any).employeeId;

  // Check if user is viewing their OWN employee documents
  const isViewingOwnDocuments = employeeId && sessionEmployeeId === employeeId;

  // Build role-based access filter
  // For employee-specific documents:
  //   - If viewing YOUR OWN documents: only see canViewEmployee docs (regardless of your role)
  //   - If viewing SOMEONE ELSE's documents: use your role to determine access
  // For company-wide documents (no employeeId): use your role
  let roleFilter: any = {};
  
  if (isViewingOwnDocuments) {
    // When viewing your own documents, you're the "employee" - only see employee-visible docs
    roleFilter = { canViewEmployee: true };
  } else if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    // Admins bypass role filtering - they see all documents
    roleFilter = {};
  } else if (user.role === "MANAGER") {
    // Managers viewing someone else's documents see manager-visible docs
    roleFilter = { canViewManager: true };
  } else {
    // Employees only see documents explicitly marked for employees
    roleFilter = { canViewEmployee: true };
  }

  if (!employeeId && user.role === "EMPLOYEE" && !sessionEmployeeId) {
    return NextResponse.json({ error: "Employee profile not found" }, { status: 403 });
  }

  const effectiveEmployeeId = employeeId || (user.role === "EMPLOYEE" ? sessionEmployeeId : undefined);

  // Fetch company documents with access control & department/job role restrictions
  const dbStart = performance.now();
  const documents = await prisma.document.findMany({
    where: {
      companyId: session.user.companyId,
      ...(effectiveEmployeeId
        ? { employeeId: effectiveEmployeeId }
        : user.role === "EMPLOYEE"
          ? { employeeId: null }
          : {}),
      deletedAt: null,
      ...roleFilter,
      OR: [
        { Department: { some: { id: user.departmentId || "" } } },
        { JobRole: { some: { id: user.jobRoleId || "" } } },
        { AND: [{ Department: { none: {} } }, { JobRole: { none: {} } }] }, // Unrestricted (global) docs
        // Include documents where the user is explicitly assigned as a signer
        ...(sessionEmployeeId ? [{ SignatureEmployees: { some: { employeeId: sessionEmployeeId } } }] : []),
        // Include documents where the user is assigned to a signature field
        ...(sessionEmployeeId ? [{ SignatureFields: { some: { assignedEmployeeId: sessionEmployeeId } } }] : []),
      ],
      ...(cursor
        ? {
            AND: [
              {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  {
                    AND: [
                      { createdAt: cursor.createdAt },
                      { id: { lt: cursor.id } },
                    ],
                  },
                ],
              },
            ],
          }
        : {}),
      ...(requiresAction
        ? {
            AND: [
              {
                OR: [{ requiresAck: true }, { requiresSignature: true }],
              },
            ],
          }
        : {}),
    },
    include: {
      User: true,
      Department: { select: { id: true, name: true } },
      JobRole: { select: { id: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const dbMs = performance.now() - dbStart;

  const hasMore = documents.length > limit;
  const page = hasMore ? documents.slice(0, limit) : documents;
  const nextCursor = hasMore
    ? encodeCursor(page[page.length - 1].createdAt as any, page[page.length - 1].id)
    : null;

  const signStart = performance.now();
  const withUrls = await Promise.all(
    page.map(async (doc) => {
      const url = await getCachedSignedUrl(session.user.companyId, doc.path, 60 * 5);
      return { ...doc, url };
    }),
  );
  const signMs = performance.now() - signStart;

  const totalMs = performance.now() - totalStart;

  const res = NextResponse.json({
    items: withUrls,
    nextCursor,
    hasMore,
    limit,
  });
  res.headers.set(
    "Server-Timing",
    `db;dur=${dbMs.toFixed(2)},sign;dur=${signMs.toFixed(2)},total;dur=${totalMs.toFixed(2)}`,
  );
  if (nextCursor) res.headers.set("x-next-cursor", nextCursor);
  res.headers.set("x-has-more", hasMore ? "1" : "0");
  res.headers.set("x-limit", String(limit));
  return res;
}
