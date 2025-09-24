import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { createAuditLogs, formatDiffsForFormData } from "@/lib/audit-helpers";

// GET: List submissions (HR/admin view)
export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submissions = await prisma.formSubmission.findMany({
    where: {
      formId: id,
      Form: { companyId: session.user.companyId },
    },
    include: { Employee: true },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(submissions);
}

// POST: Employee submits a form
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId || !session?.user?.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, employeeId, assignmentId, reasons } = await req.json();

  // Determine which employee is submitting
  const targetEmployeeId = employeeId || session.user.id;

  // Verify the target employee belongs to the same company
  const employee = await prisma.employee.findFirst({
    where: {
      id: targetEmployeeId,
      companyId: session.user.companyId,
    },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  // Create the submission
  const submission = await prisma.formSubmission.create({
    data: {
      id: crypto.randomUUID(),
      formId: id,
      employeeId: targetEmployeeId,
      data,
    },
  });

  // If this submission is for a specific assignment, mark it as completed
  if (assignmentId) {
    await prisma.formAssignment.update({
      where: { id: assignmentId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });
  }

  // Write audit logs: treat each submitted field as a new value
  try {
    const diffs = formatDiffsForFormData(data || {});
    await createAuditLogs({
      companyId: session.user.companyId!,
      employeeId: targetEmployeeId,
      section: `forms:${id}`,
      diffs,
      reasons: reasons || {},
      changedById: session.user.id!,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  return NextResponse.json(submission, { status: 201 });
}
