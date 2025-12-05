/**
 * AI Custom Field Generation Endpoint
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import {
  isAIEnabled,
  validateAPIKey,
  checkRateLimit,
} from "@/lib/ai/openai-client";
import {
  generateCustomField,
  removeCustomField,
  listCustomFields,
} from "@/lib/ai/field-generator";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    if (!isAIEnabled()) {
      const validation = validateAPIKey();
      return NextResponse.json(
        { error: validation.error || "AI not enabled" },
        { status: 503 }
      );
    }

    const rateLimit = checkRateLimit(session.user.id, 50, 3600000);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 }
      );
    }

    const { action, description, section } = await req.json();

    if (action === "generate") {
      if (!description) {
        return NextResponse.json(
          { error: "Field description is required" },
          { status: 400 }
        );
      }

      const validSections = [
        "personal-information",
        "bank-payroll",
        "emergency-contacts",
        "custom",
      ];
      const targetSection = validSections.includes(section)
        ? section
        : "custom";

      const result = await generateCustomField(
        description,
        targetSection as any,
        session.user.companyId
      );

      return NextResponse.json(result);
    }

    if (action === "remove") {
      const { fieldId, formId } = await req.json();
      if (!fieldId || !formId) {
        return NextResponse.json(
          { error: "fieldId and formId required" },
          { status: 400 }
        );
      }

      const result = await removeCustomField(
        fieldId,
        formId,
        session.user.companyId
      );
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );
  } catch (error: any) {
    console.error("[AI Field Error]", error);
    return NextResponse.json(
      { error: error.message || "Field generation failed" },
      { status: 500 }
    );
  }
}

// GET list of custom fields
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const fields = await listCustomFields(session.user.companyId);

    return NextResponse.json({
      success: true,
      fields,
      count: fields.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

