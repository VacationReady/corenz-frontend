import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

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
      include: { User: true },
    });
    if (!employee?.User)
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );

    // Create or rotate activation token
    const activationToken = randomBytes(32).toString("hex");
    await prisma.activationToken.upsert({
      where: { userId: employee.User.id },
      update: { token: activationToken },
      create: { id: crypto.randomUUID(), userId: employee.User.id, token: activationToken },
    });

    const redirectPath = employee.onboardingTemplateId
      ? `/${employee.id}/onboarding`
      : `/dashboard`;
    const baseUrl = getAppBaseUrl();
    const activationLink = `${baseUrl}/activate?token=${activationToken}&redirect=${encodeURIComponent(redirectPath)}`;

    const employeeName =
      `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim() ||
      employee.User.email;

    const { html, text } = renderPeopleCoreEmail({
      preheader: "Activate your PeopleCore account",
      title: "Activate Your PeopleCore Account",
      intro: [
        `Hi ${employeeName},`,
        "Welcome to PeopleCore! Use the button below to activate your account and get started.",
      ],
      ctas: {
        label: "Activate Account",
        href: activationLink,
      },
      outro: [
        "If you weren't expecting this email, please ignore it.",
        "Thank you,",
        "The PeopleCore Team",
      ],
    });

    await resend.emails.send({
      from: "noreply@peoplecore.co.nz",
      to: employee.User.email,
      subject: "Activate Your PeopleCore Account",
      html,
      text,
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
