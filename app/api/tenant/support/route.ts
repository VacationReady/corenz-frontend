import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

type SupportContact = {
  region: "NZ" | "AU";
  label: string;
  phone?: string;
  email?: string;
  escalationHours: {
    days: string;
    start: string;
    end: string;
    timezone: string;
    note?: string;
  };
  escalationContact?: {
    label: string;
    value: string;
    href: string;
  };
};

type SupportPayload = {
  company: {
    id: string;
    name: string | null;
    region: string | null;
  };
  defaultRegion: "NZ" | "AU";
  contacts: SupportContact[];
  helpCenterUrl: string;
};

const DEFAULT_CONTACTS: Record<"NZ" | "AU", SupportContact> = {
  NZ: {
    region: "NZ",
    label: "New Zealand support",
    phone: "+64 800 736 753",
    email: "support@peoplecore.co.nz",
    escalationHours: {
      days: "Monday to Friday",
      start: "8:00 AM",
      end: "6:00 PM",
      timezone: "NZST",
      note: "Escalations route to the on-call delivery manager.",
    },
    escalationContact: {
      label: "Escalation line",
      value: "+64 21 555 0101",
      href: "tel:+64215550101",
    },
  },
  AU: {
    region: "AU",
    label: "Australia support",
    phone: "+61 1800 462 673",
    email: "support@peoplecore.com.au",
    escalationHours: {
      days: "Monday to Friday",
      start: "8:00 AM",
      end: "6:00 PM",
      timezone: "AEST",
      note: "Escalations reach the Sydney operations pod.",
    },
    escalationContact: {
      label: "Escalation line",
      value: "+61 450 910 220",
      href: "tel:+61450910220",
    },
  },
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const company = await prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { id: true, name: true, publicHolidayRegion: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const region = (company.publicHolidayRegion as "NZ" | "AU" | null) ?? "NZ";
    const defaultRegion: "NZ" | "AU" = region === "AU" ? "AU" : "NZ";

    const contacts: SupportContact[] = (Object.values(DEFAULT_CONTACTS) as SupportContact[])
      .map((contact) => ({
        ...contact,
        escalationHours: { ...contact.escalationHours },
        escalationContact: contact.escalationContact
          ? { ...contact.escalationContact }
          : undefined,
      }))
      .sort((a, b) => {
        if (a.region === defaultRegion) return -1;
        if (b.region === defaultRegion) return 1;
        return 0;
      });

    const payload: SupportPayload = {
      company: {
        id: company.id,
        name: company.name,
        region: company.publicHolidayRegion,
      },
      defaultRegion,
      contacts,
      helpCenterUrl: "https://support.peoplecore.co",
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("[tenant/support][GET]", error);
    return NextResponse.json(
      { error: "Failed to load support configuration" },
      { status: 500 },
    );
  }
}
