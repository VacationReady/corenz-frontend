import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { reportDefinitions } from "@/lib/reportDefinitions";
import { z } from "zod";

const paginationSchema = z
  .object({
    page: z.number().int().positive().optional(),
    limit: z.number().int().positive().max(500).optional(),
    sortBy: z.string().trim().min(1).optional().nullable(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  })
  .optional();

const reportGenerateSchema = z.object({
  reportType: z
    .string({ required_error: "reportType is required" })
    .trim()
    .min(1, "reportType is required"),
  filters: z.record(z.any()).optional(),
  pagination: paginationSchema,
});

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reportType, filters, pagination } = reportGenerateSchema.parse(
      await req.json(),
    );

    const normalizedFilters = filters ?? {};
    const normalizedPagination = {
      page: pagination?.page ?? 1,
      limit: pagination?.limit ?? 50,
      sortBy: pagination?.sortBy ?? null,
      sortOrder: pagination?.sortOrder ?? "asc",
    };

    if (!reportDefinitions[reportType as keyof typeof reportDefinitions]) {
      return NextResponse.json(
        { error: "Invalid report type" },
        { status: 400 },
      );
    }

    const data = await reportDefinitions[
      reportType as keyof typeof reportDefinitions
    ].query(normalizedFilters, normalizedPagination);

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Error generating report:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
