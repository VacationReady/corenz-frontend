import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { BASE_TRANSACTIONAL_SECTIONS, SectionConfig } from "@/lib/transactional-notifications";
import { z } from "zod";

// Schema for PUT request body
const UpdatePreferencesSchema = z.object({
  sections: z.array(z.object({
    section: z.string(),
    notifyAdmin: z.boolean(),
    notifyManager: z.boolean(),
    notifyEmployee: z.boolean(),
  })),
});

// Helper to build the complete preferences response
async function buildPreferencesResponse(companyId: string) {
  // Load stored preferences for the company
  const storedPreferences = await prisma.transactionalNotificationPreference.findMany({
    where: { companyId },
  });

  // Create a map for quick lookup
  const preferenceMap = new Map(
    storedPreferences.map(p => [p.section, p])
  );

  // Load active forms to expand the forms group
  const activeForms = await prisma.form.findMany({
    where: { companyId },
    select: { id: true, name: true },
  });

  // Build the response structure
  const groups: Record<string, {
    id: string;
    label: string;
    sections: Array<{
      section: string;
      label: string;
      description: string;
      route: string;
      notifyAdmin: boolean;
      notifyManager: boolean;
      notifyEmployee: boolean;
      updatedAt: Date | null;
      isDefault: boolean;
    }>;
  }> = {};

  // Process base sections
  for (const baseSection of BASE_TRANSACTIONAL_SECTIONS) {
    if (!groups[baseSection.group]) {
      groups[baseSection.group] = {
        id: baseSection.group,
        label: baseSection.group,
        sections: [],
      };
    }

    const preference = preferenceMap.get(baseSection.id);
    groups[baseSection.group].sections.push({
      section: baseSection.id,
      label: baseSection.label,
      description: baseSection.description,
      route: baseSection.route,
      notifyAdmin: preference?.notifyAdmin ?? true, // Default to admin-only
      notifyManager: preference?.notifyManager ?? false,
      notifyEmployee: preference?.notifyEmployee ?? false,
      updatedAt: preference?.updatedAt || null,
      isDefault: !preference,
    });
  }

  // Add form-specific entries
  if (groups["Forms"]) {
    for (const form of activeForms) {
      const formSection = `forms:${form.id}`;
      const preference = preferenceMap.get(formSection);
      
      // If no specific preference, inherit from base "forms" preference
      const baseFormsPreference = preferenceMap.get("forms");
      
      groups["Forms"].sections.push({
        section: formSection,
        label: form.name,
        description: `Notifications for ${form.name} form submissions`,
        route: `forms/${form.id}`,
        notifyAdmin: preference?.notifyAdmin ?? baseFormsPreference?.notifyAdmin ?? true,
        notifyManager: preference?.notifyManager ?? baseFormsPreference?.notifyManager ?? false,
        notifyEmployee: preference?.notifyEmployee ?? baseFormsPreference?.notifyEmployee ?? false,
        updatedAt: preference?.updatedAt || null,
        isDefault: !preference,
      });
    }
  }

  return {
    groups: Object.values(groups),
  };
}

// GET handler - retrieve current preferences
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can manage notification preferences
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const response = await buildPreferencesResponse(session.user.companyId);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching transactional notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

// PUT handler - update preferences
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins can manage notification preferences
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const validation = UpdatePreferencesSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: validation.error.format() },
        { status: 400 }
      );
    }

    const { sections } = validation.data;
    const companyId = session.user.companyId;

    // Get all existing preferences for this company
    const existingPreferences = await prisma.transactionalNotificationPreference.findMany({
      where: { companyId },
      select: { section: true },
    });
    const existingSections = new Set(existingPreferences.map(p => p.section));

    // Track which sections are being updated
    const updatedSections = new Set<string>();

    // Use a transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      // Upsert each preference
      for (const pref of sections) {
        updatedSections.add(pref.section);
        
        await tx.transactionalNotificationPreference.upsert({
          where: {
            companyId_section: {
              companyId,
              section: pref.section,
            },
          },
          update: {
            notifyAdmin: pref.notifyAdmin,
            notifyManager: pref.notifyManager,
            notifyEmployee: pref.notifyEmployee,
          },
          create: {
            companyId,
            section: pref.section,
            notifyAdmin: pref.notifyAdmin,
            notifyManager: pref.notifyManager,
            notifyEmployee: pref.notifyEmployee,
          },
        });
      }

      // Delete preferences that were not in the update (cleanup stale form-specific entries)
      const sectionsToDelete = Array.from(existingSections).filter(
        section => !updatedSections.has(section)
      );

      if (sectionsToDelete.length > 0) {
        await tx.transactionalNotificationPreference.deleteMany({
          where: {
            companyId,
            section: { in: sectionsToDelete },
          },
        });
      }
    });

    // Return the updated preferences
    const response = await buildPreferencesResponse(companyId);
    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating transactional notification preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
