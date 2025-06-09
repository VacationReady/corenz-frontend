// /app/api/leave-request/[id]/route.ts

import { NextResponse } from 'next/server';
import { getToken } from "next-auth/jwt";
import { prisma } from '@/lib/prisma';

const secret = process.env.NEXTAUTH_SECRET;

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret });

  if (!token || token.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { status } = await req.json();

  try {
    const leaveRequest = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status },
    });

    return NextResponse.json(leaveRequest);
  } catch (error) {
    console.error("Error updating leave request:", error);
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }
}
