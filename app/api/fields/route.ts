import { NextResponse } from "next/server";
import { hrReportFields, hrCategories, groupFieldsByCategory } from "@/lib/hrReportFields";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Return HR-curated fields grouped by category
    const fieldsByCategory = groupFieldsByCategory();
    
    // Transform to the format expected by the UI
    const groupedFields: Record<string, { label: string; value: string; type: string; category: string }[]> = {};

    hrCategories.forEach(category => {
      const categoryFields = fieldsByCategory[category.id] || [];
      groupedFields[category.name] = categoryFields.map(field => ({
        label: field.label,
        value: field.field,
        type: field.type,
        category: category.id,
      }));
    });

    return NextResponse.json({
      categories: hrCategories,
      fields: groupedFields,
      allFields: hrReportFields,
    });
  } catch (error) {
    console.error("Error fetching HR fields:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

