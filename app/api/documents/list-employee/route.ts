// /app/api/documents/list-employee/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { documentStatusCache } from "@/lib/cache";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const SIGNED_URL_TTL_SECONDS = 60 * 5;
const SIGNED_URL_CACHE_TTL_SECONDS = 60 * 4;

export async function GET(req: NextRequest) {
  const requestStartMs = Date.now();
  const session = await auth();
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employeeId");
  const companyId = session.user.companyId;

  const rawLimit = searchParams.get("limit");
  const rawOffset = searchParams.get("offset");

  const orderByParam = searchParams.get("orderBy");
  const orderDirParam = searchParams.get("orderDir");
  const orderByField = (orderByParam === "createdAt" || orderByParam === "updatedAt" || orderByParam === "name")
    ? orderByParam
    : "createdAt";
  const orderDir = orderDirParam === "asc" ? "asc" : "desc";

  const requiresActionParam = searchParams.get("requiresAction");
  const requiresAction = requiresActionParam === "1" || requiresActionParam === "true";

  const parsedLimit = rawLimit ? Number.parseInt(rawLimit, 10) : DEFAULT_LIMIT;
  const parsedOffset = rawOffset ? Number.parseInt(rawOffset, 10) : 0;

  const limit = Number.isFinite(parsedLimit)
    ? Math.min(Math.max(parsedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

  if (!employeeId) {
    return NextResponse.json({ error: "Missing employeeId" }, { status: 400 });
  }

  // Determine user role (uppercase from session type)
  const userRole = session.user.role; // "ADMIN" | "MANAGER" | "EMPLOYEE" | "SUPER_ADMIN"

  // Build role-based filter using uppercase matches
  // Admins should see ALL documents (no role filter)
  // Managers should only see documents where canViewManager is true
  // Employees should only see documents where canViewEmployee is true
  let accessFilter = {};
  if (userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
    // Admins bypass role filtering - they see all documents
    accessFilter = {};
  } else if (userRole === "MANAGER") {
    // Managers only see documents explicitly marked for managers
    accessFilter = { canViewManager: true };
  } else if (userRole === "EMPLOYEE") {
    // Employees only see documents explicitly marked for employees
    accessFilter = { canViewEmployee: true };
  }

  const dbStartMs = Date.now();
  const whereClause = {
    employeeId,
    companyId,
    deletedAt: null,
    ...accessFilter,
    ...(requiresAction
      ? {
        OR: [{ requiresAck: true }, { requiresSignature: true }],
      }
      : {}),
  };

  const totalCount = await prisma.document.count({
    where: whereClause,
  });

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: {
      User: {
        select: {
          name: true,
          email: true,
        },
      },
      SignatureEmployees: true,
      SignatureDepartments: true,
      SignatureJobRoles: true,
    },
    orderBy: { [orderByField]: orderDir } as any,
    take: limit,
    skip: offset,
  });
  const dbDurationMs = Date.now() - dbStartMs;

  const signStartMs = Date.now();
  let cacheHits = 0;
  let cacheMisses = 0;

  const withUrls = await Promise.all(
    documents.map(async (doc) => {
      const cacheKey = `doc-signed-url:${companyId}:${doc.id}:${encodeURIComponent(doc.path)}`;
      const cachedUrl = await documentStatusCache.get<string>(cacheKey);
      if (cachedUrl) {
        cacheHits++;
        return { ...doc, url: cachedUrl };
      }

      cacheMisses++;
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(doc.path, SIGNED_URL_TTL_SECONDS);

      const signedUrl = signed?.signedUrl ?? null;
      if (signedUrl) {
        await documentStatusCache.set(cacheKey, signedUrl, SIGNED_URL_CACHE_TTL_SECONDS);
      }

      return { ...doc, url: signedUrl };
    }),
  );
  const signDurationMs = Date.now() - signStartMs;

  const response = NextResponse.json(withUrls);
  response.headers.set("X-Total-Count", String(totalCount));
  response.headers.set("X-Limit", String(limit));
  response.headers.set("X-Offset", String(offset));
  response.headers.set(
    "Server-Timing",
    [
      `db;dur=${dbDurationMs}`,
      `sign;dur=${signDurationMs};desc=\"cache_hits=${cacheHits},cache_misses=${cacheMisses}\"`,
      `total;dur=${Date.now() - requestStartMs}`,
    ].join(", "),
  );
  return response;
}

