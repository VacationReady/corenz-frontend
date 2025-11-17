import { NextResponse } from "next/server";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { serializeFilterGroup, normalizeFilterGroupInput } from "@/lib/reportFilters";
import type { FilterGroup } from "@/lib/reportFilters";



export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await ensurePrismaConnected();
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
    }

    const { 
      name, 
      selectedFields, 
      fields, // Support legacy format
      category, 
      filters, // Legacy flat array
      filterGroup, // New grouped format
      sort, 
      templateId 
    } = await req.json();

    console.log("📝 Received save request:", { 
      name, 
      selectedFields: selectedFields ? `${selectedFields.length} fields: [${selectedFields.slice(0,3).join(', ')}${selectedFields.length > 3 ? '...' : ''}]` : "no selectedFields", 
      fields: fields ? `${fields.length} legacy fields` : "no legacy fields", 
      category, 
      filters: Array.isArray(filters) ? `${filters.length} legacy filters` : "no legacy filters",
      filterGroup: filterGroup ? "FilterGroup present" : "no filterGroup",
      sort: sort ? `sort by ${sort.field || 'unknown field'}` : "no sorting", 
      templateId 
    });

    console.log("🔍 Raw request data:", JSON.stringify({ selectedFields, fields, filterGroup }, null, 2));

    // Support both new format (selectedFields) and legacy format (fields)
    const reportFields = selectedFields || fields;
    
    // Normalize filters: prefer filterGroup, fallback to legacy filters array
    let normalizedFilterGroup: FilterGroup;
    if (filterGroup) {
      normalizedFilterGroup = normalizeFilterGroupInput(filterGroup);
    } else if (filters && filters.length > 0) {
      normalizedFilterGroup = normalizeFilterGroupInput(filters);
    } else {
      normalizedFilterGroup = normalizeFilterGroupInput(undefined);
    }
    
    // Serialize for storage
    const serializedFilterGroup = serializeFilterGroup(normalizedFilterGroup);
    
    console.log("🔍 Final reportFields:", reportFields);
    console.log("🔍 Serialized filterGroup:", JSON.stringify(serializedFilterGroup, null, 2));
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
        filters: serializedFilterGroup, // Store serialized FilterGroup (backward compatible)
        sort: sort ? sort : undefined, // Store sort config as JSON object
        createdBy: session.user.id,
        companyId: session.user.companyId,
        description: templateId ? `Created from template: ${templateId}` : undefined,
        updatedAt: new Date(),
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

