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
      selectedFields, 
      fields, 
      category, 
      filters: filters ? `${filters.length} filters` : "no filters", 
      sort: sort ? `sort by ${sort.field}` : "no sorting", 
      templateId 
    });

    // Support both new format (selectedFields) and legacy format (fields)
    const reportFields = selectedFields || fields;
    
    if (!reportFields || !Array.isArray(reportFields) || reportFields.length === 0) {
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
        filters: filters ? JSON.stringify(filters) : null, // Store filters as JSON
        sort: sort ? JSON.stringify(sort) : null, // Store sort config as JSON
        createdBy: session.user.id,
        companyId: session.user.companyId,
        description: templateId ? `Created from template: ${templateId}` : null,
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
