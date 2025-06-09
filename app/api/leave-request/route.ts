// app/api/leave-request/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

const secret = process.env.NEXTAUTH_SECRET;

export async function POST(req: NextRequest) {
  const token = await getToken({ req, secret }) as { id: string } | null;

  if (!token || !token.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { type, startDate, endDate, reason } = await req.json();

  const newLeaveRequest = await prisma.leaveRequest.create({
    data: {
      userId: token.id,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason,
      status: 'PENDING',
    },
  });

  return NextResponse.json(newLeaveRequest, { status: 201 });
}

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret }) as { id: string } | null;

  if (!token || !token.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: token.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(requests);
}
