// app/api/seed-user/route.ts - Development-only seed endpoint
// SECURITY: This endpoint is restricted to development environments only
// and requires a secret token to prevent unauthorized access.
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";

const SEED_SECRET = process.env.SEED_USER_SECRET;
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SEED_USER_EMAIL = "seed-admin@localhost.dev";

export async function POST(req: NextRequest) {
  // SECURITY: Block in production environments entirely
  if (IS_PRODUCTION) {
    console.warn("[SECURITY] Attempted seed-user access in production");
    return NextResponse.json(
      { error: "This endpoint is disabled in production" },
      { status: 403 }
    );
  }

  // SECURITY: Require secret token even in development
  // Set SEED_USER_SECRET in .env.local for local development
  const authHeader = req.headers.get("x-seed-secret");
  if (!SEED_SECRET || authHeader !== SEED_SECRET) {
    console.warn("[SECURITY] Invalid or missing seed secret");
    return NextResponse.json(
      { error: "Unauthorized - invalid or missing seed secret" },
      { status: 401 }
    );
  }

  try {
    // Parse optional parameters from request body
    let email = SEED_USER_EMAIL;
    let companyId: string | undefined;
    
    try {
      const body = await req.json();
      if (body.email) email = body.email;
      if (body.companyId) companyId = body.companyId;
    } catch {
      // No body provided, use defaults
    }

    // Find target company
    const company = companyId
      ? await prisma.company.findUnique({ where: { id: companyId } })
      : await prisma.company.findFirst();
      
    if (!company) {
      return NextResponse.json(
        { error: "No company found. Create a company first via /setup-admin." },
        { status: 400 }
      );
    }

    // SECURITY: Check if seed user already exists (one-time use per company)
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        companyId: company.id,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          error: "Seed user already exists for this company",
          hint: "Delete the existing user first or use a different email"
        },
        { status: 409 }
      );
    }

    // Generate a random password instead of hardcoded one
    const randomPassword = randomBytes(16).toString("base64url");
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: "Seed Admin",
        role: "ADMIN",
        companyId: company.id,
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        isActivated: true,
      },
    });

    // Return the generated password so the developer can use it
    // This is safe because this endpoint only works in development
    return NextResponse.json({
      message: "Seed user created successfully",
      user: {
        id: user.id,
        email: user.email,
        companyId: user.companyId,
      },
      credentials: {
        email,
        password: randomPassword,
        note: "Save this password - it cannot be retrieved again",
      },
    });
  } catch (error: any) {
    console.error("[seed-user] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
