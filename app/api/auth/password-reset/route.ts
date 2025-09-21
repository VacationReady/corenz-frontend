import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { resend } from "@/lib/resend";
import { buildPasswordResetEmail } from "@/lib/email/password-reset";

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@peoplecore.co.nz";
const RATE_LIMIT_WINDOW = Number(process.env.PASSWORD_RESET_WINDOW_MS ?? 15 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.PASSWORD_RESET_LIMIT ?? 3);

function normaliseEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return trimmed;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const emailInput = normaliseEmail(body?.email);
  if (!emailInput || !isEmail(emailInput)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const ip =
    request.ip ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  const rateKey = `password-reset:${emailInput.toLowerCase()}:${ip}`;

  try {
    const limited = await rateLimit(rateKey, {
      limit: RATE_LIMIT_MAX,
      windowMs: RATE_LIMIT_WINDOW,
    });

    if (limited) {
      return NextResponse.json(
        { error: "Too many reset attempts. Try again later." },
        { status: 429 },
      );
    }
  } catch (error) {
    console.warn("Password reset rate limit failed", error);
    // Continue on soft failure to avoid blocking legitimate users
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: emailInput, mode: "insensitive" } as any,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        Company: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user || !user.companyId || !user.Company) {
      // Avoid revealing whether the account exists for privacy reasons
      return NextResponse.json({ success: true });
    }

    const token = randomBytes(32).toString("hex");
    const now = new Date();

    await prisma.activationToken.upsert({
      where: { userId: user.id },
      update: {
        token,
        createdAt: now,
      },
      create: {
        id: randomUUID(),
        token,
        userId: user.id,
        createdAt: now,
      },
    });

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      new URL(request.url).origin;
    const resetUrl = `${appUrl}/activate?token=${token}`;

    const fullName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();

    const { subject, html, text } = buildPasswordResetEmail({
      recipientName: fullName || null,
      companyName: user.Company?.name,
      resetUrl,
    });

    await resend.emails.send({
      from: FROM_EMAIL,
      to: user.email,
      subject,
      html,
      text,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password reset request failed", error);
    return NextResponse.json(
      { error: "We couldn't send the reset email. Please try again." },
      { status: 500 },
    );
  }
}

