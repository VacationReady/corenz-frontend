import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: List submissions (HR/admin view)
export async function GET(_: Request, { params }: { params: { formId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const submissions = await prisma.formSubmission.findMany({
    where: {
      formId: params.formId,
      form: { companyId: session.user.companyId },
    },
    include: { employee: true },
    orderBy: { submittedAt: "desc" },
  });

  return NextResponse.json(submissions);
}

// POST: Employee submits a form
export async function POST(req: Request, { params }: { params: { formId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || !session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await req.json();

  const submission = await prisma.formSubmission.create({
    data: {
      formId: params.formId,
      employeeId: session.user.id, // assumes user is also an employee
      data,
    },
  });

  return NextResponse.json(submission, { status: 201 });
}
