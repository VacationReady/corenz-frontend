import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const token = await getToken({ req });

  if (!token || !token.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { type, startDate, endDate, reason } = body;

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
