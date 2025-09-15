import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { randomBytes } from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  _req: NextResponse extends never ? never : any,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id: employeeId } = params;
  try {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, companyId: session.user.companyId },
      include: { user: true },
    });
    if (!employee?.user)
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );

    // Create or rotate activation token
    const activationToken = randomBytes(32).toString("hex");
    await prisma.activationToken.upsert({
      where: { userId: employee.user.id },
      update: { token: activationToken },
      create: { userId: employee.user.id, token: activationToken },
    });

    const redirectPath = employee.onboardingTemplateId
      ? `/${employee.id}/onboarding`
      : `/dashboard`;
    const activationLink = `${process.env.NEXT_PUBLIC_APP_URL}/activate?token=${activationToken}&redirect=${encodeURIComponent(redirectPath)}`;

    await resend.emails.send({
      from: "noreply@peoplecore.co.nz",
      to: employee.user.email,
      subject: "Activate Your PeopleCore Account",
      html: `
        <p>Hi ${employee.user.firstName || ""},</p>
        <p>Welcome to PeopleCore! Please click the link below to activate your account and get started:</p>
        <p><a href="${activationLink}">Activate Your Account</a></p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Send invite error:", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
