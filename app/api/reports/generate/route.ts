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

    // Group fields by table
    const fieldGroups: Record<string, string[]> = {};
    for (const field of fields) {
      const [table, column] = field.split(".");
      if (!fieldGroups[table]) fieldGroups[table] = [];
      fieldGroups[table].push(column);
    }

    // Build Prisma `select` object dynamically
    const select: any = {};

    if (fieldGroups["user"]) {
      select.user = { select: {} };
      fieldGroups["user"].forEach(col => {
        select.user.select[col] = true;
      });
    }
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
      select.leaveRequests = { select: {} };
      fieldGroups["leaverequest"].forEach(col => {
        select.leaveRequests.select[col] = true;
      });
    }
    if (fieldGroups["leaveentitlement"]) {
      select.leaveEntitlements = { select: {} };
      fieldGroups["leaveentitlement"].forEach(col => {
        select.leaveEntitlements.select[col] = true;
      });
    }

    // Query users as base, adjust as needed per your structure
    const data = await prisma.user.findMany({
      select,
      take: 100, // Limit for safety; adjust or paginate later
    });

    // Flatten nested objects for DataTable consumption
    const flattened = data.map((item) => {
      const flatItem: Record<string, any> = {};
      for (const [table, columns] of Object.entries(fieldGroups)) {
        const tableData = (item as any)[table];
        if (Array.isArray(tableData)) {
          flatItem[table] = JSON.stringify(tableData); // If relation returns many, stringify
        } else if (typeof tableData === "object" && tableData !== null) {
          for (const col of columns) {
            flatItem[`${table}.${col}`] = tableData[col] ?? "";
          }
        } else {
          flatItem[`${table}`] = tableData ?? "";
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
