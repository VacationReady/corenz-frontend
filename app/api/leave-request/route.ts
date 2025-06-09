// app/api/leave-request/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions"; // ✅ Adjust import if needed
import { prisma } from "@/lib/prisma";
import type { Session } from "next-auth";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions) as Session;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { type, startDate, endDate, reason } = await req.json();

  const newLeaveRequest = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: "PENDING",
    },
  });

  return NextResponse.json(newLeaveRequest, { status: 201 });
}

export async function GET() {
  const session = await getServerSession(authOptions) as Session;

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(requests);
}
