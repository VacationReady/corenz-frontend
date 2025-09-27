import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({
      dailyDigestEnabled: false,
      weeklyDigestEnabled: false,
      digestRecipients: [],
      emailTemplateEnabled: false,
      defaultChannels: {}
    });
  }

  const settings = await prisma.notificationSettings.findUnique({
    where: { companyId: session.user.companyId },
  });
  if (!settings) {
    return NextResponse.json({
      dailyDigestEnabled: false,
      weeklyDigestEnabled: false,
      digestRecipients: [],
      emailTemplateEnabled: false,
      defaultChannels: {}
    });
  }
  return NextResponse.json(settings);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const {
    dailyDigestEnabled = false,
    weeklyDigestEnabled = false,
    digestRecipients = [],
    emailTemplateEnabled = false,
    emailTemplateConfig,
    defaultChannels = {},
  } = body || {};

  const saved = await prisma.notificationSettings.upsert({
    where: { companyId: session.user.companyId },
    update: {
      dailyDigestEnabled,
      weeklyDigestEnabled,
      digestRecipients,
      emailTemplateEnabled,
      emailTemplateConfig: emailTemplateConfig ?? null,
      defaultChannels,
      updatedAt: new Date(),
    },
    create: {
      id: crypto.randomUUID(),
      companyId: session.user.companyId,
      dailyDigestEnabled,
      weeklyDigestEnabled,
      digestRecipients,
      emailTemplateEnabled,
      emailTemplateConfig: emailTemplateConfig ?? null,
      defaultChannels,
      updatedAt: new Date(),
    },
  });
  return NextResponse.json(saved);
}


