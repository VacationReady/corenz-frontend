import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";

export async function GET(req: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN" || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let expiryRules;
    try {
      // Primary query: scoped to company if column exists
      expiryRules = await prisma.expiryRule.findMany({
        where: {
          OR: [
            { companyId: session.user.companyId },
            { companyId: null as any },
          ],
        },
        orderBy: { category: "asc" },
      });
    } catch (err) {
      // Fallback: in case the database schema lacks companyId on ExpiryRule
      console.error("ExpiryRule company-scoped query failed, falling back:", err);
      expiryRules = await prisma.expiryRule.findMany({
        orderBy: { category: "asc" },
      });
    }

    // Also fetch automation rules created from the expiry wizard (DOCUMENT_EXPIRING trigger)
    // Fetch all DOCUMENT_EXPIRING rules and filter in code to check for wizard-created ones
    const allAutomationRules = await prisma.automationRule.findMany({
      where: {
        companyId: session.user.companyId,
        triggerType: "DOCUMENT_EXPIRING",
      },
      orderBy: { createdAt: "desc" },
    });

    // Filter to only include rules created from the wizard
    // These have either the description or entity/field metadata in triggerConfig
    const automationRules = allAutomationRules.filter((rule) => {
      const triggerConfig = rule.triggerConfig as any;
      const hasWizardDescription = rule.description?.includes("Auto-generated from Expiry Alerts wizard");
      const hasEntityMetadata = triggerConfig?.entity && triggerConfig?.fieldId;
      return hasWizardDescription || hasEntityMetadata;
    });

    // Convert automation rules to a format compatible with ExpiryRule for display
    const convertedAutomationRules = automationRules.map((rule) => {
      const triggerConfig = rule.triggerConfig as any;
      const fieldId = triggerConfig?.fieldId || "Unknown";
      const daysBefore = triggerConfig?.daysBefore || 30;
      
      // Map fieldId to readable category names
      const fieldCategoryMap: Record<string, string> = {
        "DriverLicence.expiryDate": "Driver Licence",
        "TrainingRecord.expiryDate": "Training",
        "EmploymentCheck.expiryDate": "Employment Checks",
        "Document.signatureDueAt": "Document Signature",
        "LeaveEntitlement.carryoverExpiry": "Leave Carryover",
        "EmployeeOffboarding.lastWorkingDate": "Offboarding",
      };
      
      const category = fieldCategoryMap[fieldId] || fieldId.split(".")[0] || "Document";
      
      return {
        id: rule.id,
        category: `${category} - ${daysBefore} days`,
        daysBefore,
        notifyAdmin: true, // Default - automation rules handle this via actions
        notifyManager: true,
        notifyEmployee: true,
        isAutomationRule: true, // Flag to distinguish from legacy ExpiryRule
        automationRuleId: rule.id,
        isActive: rule.isActive,
        fieldId,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
      };
    });

    // Combine both types of rules
    const allRules = [...expiryRules, ...convertedAutomationRules];
    
    return NextResponse.json(allRules);
  } catch (error) {
    console.error("Error fetching expiry rules:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

