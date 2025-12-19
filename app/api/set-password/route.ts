// app/api/set-password/route.ts - Migrated from Pages Router
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { resend } from "@/lib/resend";
import { renderPeopleCoreEmail } from "@/lib/email/template";

// Token expiry duration: 72 hours (configurable via env)
const TOKEN_EXPIRY_HOURS = parseInt(process.env.ACTIVATION_TOKEN_EXPIRY_HOURS || "72", 10);

export async function POST(req: NextRequest) {
  try {
    const { token, password, companyId } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Missing token or password" }, { status: 400 });
    }

    // Server-side password policy enforcement
    const hasMinLength = typeof password === "string" && password.length >= 6;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!hasMinLength || !hasUppercase || !hasNumber || !hasSpecial) {
      return NextResponse.json({
        error:
          "Password must be at least 6 characters and include an uppercase letter, a number, and a special character.",
      }, { status: 400 });
    }

    // 1. Validate token
    console.log(`[set-password] Looking up token: ${token.substring(0, 8)}...`);
    
    const storedToken = await prisma.activationToken.findUnique({
      where: { token },
    });

    if (!storedToken) {
      // Log for debugging - check if ANY tokens exist
      const tokenCount = await prisma.activationToken.count();
      console.log(`[set-password] Token not found. Total tokens in DB: ${tokenCount}`);
      
      return NextResponse.json({ 
        error: "Invalid activation token. Please request a new activation email from your administrator." 
      }, { status: 400 });
    }
    
    console.log(`[set-password] Token found, created at: ${storedToken.createdAt.toISOString()}, userId: ${storedToken.userId}`)

    // 2. Check token expiry (based on createdAt + configurable expiry duration)
    const now = Date.now();
    const tokenCreatedAt = storedToken.createdAt.getTime();
    const tokenAgeMs = now - tokenCreatedAt;
    const tokenAgeHours = tokenAgeMs / (60 * 60 * 1000);
    const expiryMs = TOKEN_EXPIRY_HOURS * 60 * 60 * 1000;
    
    console.log(`[set-password] Token age check - Now: ${new Date(now).toISOString()}, Created: ${storedToken.createdAt.toISOString()}, Age: ${tokenAgeHours.toFixed(2)}h, Expiry: ${TOKEN_EXPIRY_HOURS}h`);
    
    if (tokenAgeMs > expiryMs) {
      console.log(`[set-password] Token expired! Age ${tokenAgeHours.toFixed(2)}h > ${TOKEN_EXPIRY_HOURS}h limit`);
      
      // Delete expired token
      await prisma.activationToken.delete({
        where: { token },
      });
      
      return NextResponse.json({ 
        error: `This activation link has expired (valid for ${TOKEN_EXPIRY_HOURS} hours). Please request a new activation email from your administrator.` 
      }, { status: 410 });
    }

    // 3. Get user by token.userId
    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 4. Enforce tenant match if provided (defense-in-depth)
    if (companyId && user.companyId !== companyId) {
      return NextResponse.json({ error: "Activation link is not for this tenant" }, { status: 400 });
    }

    // 5. Get employee linked to user
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // 6. Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 7. Update user password and mark employee as active + activated atomically
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          isActivated: true,
          sessionVersion: { increment: 1 },
          updatedAt: new Date(),
        },
      });

      await tx.employee.update({
        where: { id: employee.id },
        data: {
          isActive: true, // ✅ VALID FIELD
        },
      });

      await tx.activationToken.delete({
        where: { token },
      });
    });

    // 9. Notify admin that the user has activated/logged in
    try {
      const adminUsers = await prisma.user.findMany({
        where: { role: "ADMIN", companyId: user.companyId || undefined },
        select: { email: true },
      });
      const recipients = adminUsers
        .map((u) => u.email)
        .filter(Boolean) as string[];
      if (recipients.length) {
        const actorName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;
        const { html, text } = renderPeopleCoreEmail({
          preheader: `${actorName} activated their account`,
          title: "Account Activation Notice",
          intro: [
            `Hello,`,
            `${actorName} (${user.email}) has activated their PeopleCore account.`,
          ],
          outro: [
            "You are receiving this notification because you are listed as an administrator.",
          ],
        });

        await resend.emails.send({
          from: "noreply@peoplecore.co.nz",
          to: recipients,
          subject: "User activated their account",
          html,
          text,
        });
      }
    } catch (e) {
      console.warn("Failed to send admin activation email:", e);
    }

    return NextResponse.json({ message: "Password set successfully" });
  } catch (error) {
    console.error("Error in set-password:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
