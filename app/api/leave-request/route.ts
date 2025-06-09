import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const status = url.searchParams.get("status");

  const whereClause: any = {};

  if (status) {
    whereClause.status = status;
  } else {
    whereClause.userId = session.user.id;
  }

  const requests = await prisma.leaveRequest.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(requests);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { startDate, endDate, type, reason } = await req.json();

  if (!startDate || !endDate || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      reason,
    },
  });

  return NextResponse.json(leave, { status: 201 });
}
