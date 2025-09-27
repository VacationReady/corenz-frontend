import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { resend } from "@/lib/resend";

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;

  const channel = await prisma.notificationChannel.findUnique({ where: { id } });
  if (!channel || channel.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Minimal smoke test: email via Resend, others: send a POST to webhook URL if present
    if (channel.type === "EMAIL") {
      const to = session.user.email || "test@example.com";
      await resend.emails.send({
        from: process.env.FROM_EMAIL || "noreply@example.com",
        to,
        subject: "Notification channel test",
        html: `<p>This is a test notification for channel <strong>${channel.name}</strong>.</p>`
      });
    } else if ((channel.type === "SLACK" || channel.type === "TEAMS") && (channel.config as any)?.webhookUrl) {
      await fetch((channel.config as any).webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `Test from PeopleCore: ${channel.name}` })
      });
    } else if (channel.type === "WEBHOOK" && (channel.config as any)?.url) {
      await fetch((channel.config as any).url, {
        method: (channel.config as any)?.method || "POST",
        headers: { "Content-Type": "application/json", ...(channel.config as any)?.headers },
        body: JSON.stringify({ message: `Test from PeopleCore: ${channel.name}` })
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send test notification" }, { status: 500 });
  }
}


