import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { 
      name, 
      selectedFields, 
      fields, // Support legacy format
      category, 
      filters, 
      sort, 
      templateId 
    } = await req.json();

    console.log("📝 Received save request:", { 
      name, 
      selectedFields: selectedFields ? `${selectedFields.length} fields: [${selectedFields.slice(0,3).join(', ')}${selectedFields.length > 3 ? '...' : ''}]` : "no selectedFields", 
      fields: fields ? `${fields.length} legacy fields` : "no legacy fields", 
      category, 
      filters: Array.isArray(filters) ? `${filters.length} filters` : `filters type: ${typeof filters}`, 
      sort: sort ? `sort by ${sort.field || 'unknown field'}` : "no sorting", 
      templateId 
    });

    console.log("🔍 Raw request data:", JSON.stringify({ selectedFields, fields }, null, 2));

    // Support both new format (selectedFields) and legacy format (fields)
    const reportFields = selectedFields || fields;
    
    console.log("🔍 Final reportFields:", reportFields);
    console.log("🔍 reportFields type:", typeof reportFields);
    console.log("🔍 reportFields isArray:", Array.isArray(reportFields));
    console.log("🔍 reportFields length:", reportFields?.length);
    
    if (!reportFields || !Array.isArray(reportFields) || reportFields.length === 0) {
      console.error("❌ Field validation failed:", {
        reportFields,
        isArray: Array.isArray(reportFields),
        length: reportFields?.length
      });
      return NextResponse.json(
        { error: "No fields selected." },
        { status: 400 },
      );
    }

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Report name is required." },
        { status: 400 },
      );
    }

    const newReport = await prisma.savedReport.create({
      data: {
        name: name.trim(),
        category: category || "custom",
        fields: reportFields, // Store fields array
        filters: filters && filters.length > 0 ? filters : undefined, // Store filters as JSON object
        sort: sort ? sort : undefined, // Store sort config as JSON object
        createdBy: session.user.id,
        companyId: session.user.companyId,
        description: templateId ? `Created from template: ${templateId}` : undefined,
      },
    });

    console.log("✅ Report saved successfully:", newReport.id);

    return NextResponse.json({ 
      success: true, 
      id: newReport.id,
      data: newReport 
    });
  } catch (err) {
    console.error("❌ Failed to save report:", err);
    return NextResponse.json({ 
      error: "Server error", 
      details: err instanceof Error ? err.message : "Unknown error" 
    }, { status: 500 });
  }
}
