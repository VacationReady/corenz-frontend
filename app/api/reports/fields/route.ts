export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { hrReportFields } from "@/lib/hrReportFields";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

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
		if (!session?.user?.companyId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Fetch active forms for this tenant
		const forms = await prisma.form.findMany({
			where: { companyId: session.user.companyId, isActive: true },
			select: { id: true, name: true, slug: true, schema: true },
		});

		const dynamicFormFields = forms.flatMap((form) => {
			const schema = (form.schema as any[]) || [];
			return schema.map((field) => {
				const key = slugify(field.label || field.id || "field");
				return {
					model: "FormSubmission",
					field: `FormSubmission.data.${form.slug}.${key}`,
					label: `${form.name}: ${field.label}`,
					type: mapFormFieldTypeToHRType(field.type),
					filterable: true,
					sortable: true,
					category: "forms",
					description: `Field from form '${form.name}'`,
					enumValues: Array.isArray(field.options) ? field.options : undefined,
				};
			});
		});

		return NextResponse.json([...hrReportFields, ...dynamicFormFields]);
	} catch (error) {
		console.error("Error fetching report fields:", error);
		return NextResponse.json(
			{ error: "Internal Server Error" },
			{ status: 500 },
		);
	}
}

