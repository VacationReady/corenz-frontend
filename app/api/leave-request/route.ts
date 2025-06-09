import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const token = await getToken({ req });

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

export async function GET(req: Request) {
  const token = await getToken({ req });

  if (!token || !token.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: token.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(requests);
}
