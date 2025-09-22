import { NextResponse } from "next/server";
import { hrReportFields, hrCategories, groupFieldsByCategory } from "@/lib/hrReportFields";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";

function mapFormFieldTypeToHRType(type?: string): "string" | "number" | "date" | "boolean" | "enum" {
	switch ((type || "text").toLowerCase()) {
		case "number": return "number";
		case "date": return "date";
		case "checkbox": return "boolean";
		case "select": return "enum";
		default: return "string";
	}
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9\s.]/g, "")
		.replace(/\s+/g, "-")
		.trim();
}

export async function GET() {
	try {
		const session = await getServerSession(authOptions);

		// Return HR-curated fields grouped by category
		const fieldsByCategory = groupFieldsByCategory();

		// Inject Forms fields dynamically if authenticated
		let dynamicForms: { label: string; value: string; type: string; category: string }[] = [];
		if (session?.user?.companyId) {
			const forms = await prisma.form.findMany({
				where: { companyId: session.user.companyId, isActive: true },
				select: { id: true, name: true, slug: true, schema: true },
			});
			dynamicForms = forms.flatMap((form) => {
				const rawSchema: any = (form.schema as any);
				const schemaArray: any[] = Array.isArray(rawSchema) ? rawSchema : [];
				return schemaArray.map((field: any) => {
					const key = slugify((field && (field.label || field.id)) || "field");
					return {
						label: `${form.name}: ${field?.label ?? key}`,
						value: `FormSubmission.data.${form.slug}.${key}`,
						type: mapFormFieldTypeToHRType(field?.type),
						category: "forms",
					};
				});
			});
		}
		
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

		// Append dynamic forms under Forms category name bucket
		const formsCategory = hrCategories.find(c => c.id === "forms");
		if (formsCategory) {
			groupedFields[formsCategory.name] = [
				...(groupedFields[formsCategory.name] || []),
				...dynamicForms,
			];
		}

		return NextResponse.json({
			categories: hrCategories,
			fields: groupedFields,
			allFields: [
				...hrReportFields,
				...dynamicForms.map(df => ({
					model: "FormSubmission",
					field: df.value,
					label: df.label,
					type: df.type as any,
					category: "forms",
					filterable: true,
					sortable: true,
				}))
			],
		});
	} catch (error) {
		console.error("Error fetching HR fields:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

