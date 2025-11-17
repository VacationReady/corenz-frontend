import { NextResponse } from "next/server";
import { z } from "zod";
import { POST as runReportQuery } from "../query/route";

const sortConfigSchema = z.object({
  field: z.string().trim().min(1),
  direction: z.enum(["asc", "desc"]).optional(),
});

const previewSchema = z.object({
  selectedFields: z.array(z.string().trim().min(1)).min(1),
  filters: z.array(z.record(z.any())).optional(), // Legacy support
  filterGroup: z.any().optional(), // New grouped filter format
  sort: sortConfigSchema.optional(), // Single sort (legacy)
  sorts: z.array(sortConfigSchema).optional(), // Multi-sort array
  limit: z.number().int().positive().max(50).optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { limit = 25, ...rest } = previewSchema.parse(json);
    const safeLimit = Math.min(limit, 25);

    const headers = new Headers(req.headers);
    headers.set("Content-Type", "application/json");

    // Pass through both legacy filters and new filterGroup
    const proxyRequest = new Request(req.url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...rest,
        pagination: { page: 1, limit: safeLimit },
      }),
    });

    return runReportQuery(proxyRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          status: "error",
          message: "Invalid preview payload",
          details: error.flatten(),
          data: [],
          total: 0,
        },
        { status: 400 },
      );
    }

    console.error("Error executing report preview", error);
    return NextResponse.json(
      {
        status: "error",
        message: "Unable to fetch preview data",
        data: [],
        total: 0,
      },
      { status: 500 },
    );
  }
}
