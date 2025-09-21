import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { documentId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fields = await prisma.documentSignatureField.findMany({
    where: { documentId: params.documentId },
    orderBy: { pageNumber: "asc" },
  });
  return NextResponse.json(fields);
}

export async function POST(
  req: NextRequest,
  { params }: { params: { documentId: string } },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.companyId || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const items = Array.isArray(body) ? body : [body];

  const created = await prisma.$transaction(
    items.map((f: any) =>
      prisma.documentSignatureField.create({
        data: {
          id: crypto.randomUUID(),
          documentId: params.documentId,
          pageNumber: f.pageNumber ?? 1,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          label: f.label ?? null,
          required: f.required ?? true,
          assignedEmployeeId: f.assignedEmployeeId ?? null,
          assignedDepartmentId: f.assignedDepartmentId ?? null,
          assignedJobRoleId: f.assignedJobRoleId ?? null,
        },
      }),
    ),
  );

  return NextResponse.json(created, { status: 201 });
}


