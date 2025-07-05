import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fieldsParam = searchParams.get("fields");

    if (!fieldsParam) {
      return NextResponse.json({ error: "No fields provided." }, { status: 400 });
    }

    const fields = fieldsParam.split(",").map(f => f.trim()).filter(Boolean);

    // Group fields by model
    const fieldGroups: Record<string, string[]> = {};
    for (const field of fields) {
      const [model, column] = field.split(".");
      if (!fieldGroups[model]) fieldGroups[model] = [];
      fieldGroups[model].push(column);
    }

    // Build Prisma `select` object correctly:
    const select: any = {};

    // User fields (top-level)
    if (fieldGroups["user"]) {
      fieldGroups["user"].forEach(col => {
        select[col] = true;
      });
    }

    // Related models
    if (fieldGroups["employee"]) {
      select.employee = { select: {} };
      fieldGroups["employee"].forEach(col => {
        select.employee.select[col] = true;
      });
    }
    if (fieldGroups["department"]) {
      select.department = { select: {} };
      fieldGroups["department"].forEach(col => {
        select.department.select[col] = true;
      });
    }
    if (fieldGroups["jobrole"]) {
      select.jobRole = { select: {} };
      fieldGroups["jobrole"].forEach(col => {
        select.jobRole.select[col] = true;
      });
    }
    if (fieldGroups["leaverequest"]) {
      select.leaveRequestsRequested = { select: {} };
      fieldGroups["leaverequest"].forEach(col => {
        select.leaveRequestsRequested.select[col] = true;
      });
    }
    if (fieldGroups["leaveentitlement"]) {
      select.leaveEntitlements = { select: {} };
      fieldGroups["leaveentitlement"].forEach(col => {
        select.leaveEntitlements.select[col] = true;
      });
    }

    const data = await prisma.user.findMany({
      select,
      take: 100,
    });

    // Flatten nested structures for DataTable
    const flattened = data.map((item) => {
      const flatItem: Record<string, any> = {};

      for (const [key, value] of Object.entries(item)) {
        if (typeof value === "object" && value !== null) {
          for (const [subKey, subValue] of Object.entries(value)) {
            flatItem[`${key}.${subKey}`] = subValue;
          }
        } else {
          flatItem[key] = value;
        }
      }

      return flatItem;
    });

    return NextResponse.json(flattened);
  } catch (error) {
    console.error("Error generating report:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
