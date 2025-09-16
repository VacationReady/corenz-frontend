import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Retrieve form data for an employee
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");

  if (!employeeId) {
    return NextResponse.json(
      { error: "employeeId is required" },
      { status: 400 },
    );
  }

  try {
    // Verify the form exists and belongs to the company
    const form = await prisma.form.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
        isActive: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Verify the employee belongs to the company
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.user.companyId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Get the data record for this form and employee
    const dataRecord = await prisma.formDataRecord.findUnique({
      where: {
        formId_employeeId: {
          formId: params.id,
          employeeId: employeeId,
        },
      },
    });

    return NextResponse.json({
      form: {
        id: form.id,
        name: form.name,
        formType: form.formType,
        schema: form.schema,
      },
      data: dataRecord?.data || {},
      lastUpdated: dataRecord?.updatedAt || null,
    });
  } catch (error) {
    console.error("Error fetching form data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST/PUT: Save or update form data for an employee
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { employeeId, data } = await req.json();

  if (!employeeId || !data) {
    return NextResponse.json(
      { error: "employeeId and data are required" },
      { status: 400 },
    );
  }

  try {
    // Verify the form exists and belongs to the company
    const form = await prisma.form.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
        isActive: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    // Verify the employee belongs to the company
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.user.companyId,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 },
      );
    }

    // Upsert the data record (create or update)
    const dataRecord = await prisma.formDataRecord.upsert({
      where: {
        formId_employeeId: {
          formId: params.id,
          employeeId: employeeId,
        },
      },
      update: {
        data: data,
      },
      create: {
        id: crypto.randomUUID(),
        updatedAt: new Date(),
        formId: params.id,
        employeeId: employeeId,
        data: data,
      },
    });

    return NextResponse.json(dataRecord, { status: 200 });
  } catch (error) {
    console.error("Error saving form data:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
