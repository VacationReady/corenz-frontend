// app/api/leave-request/[id]/route.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

const secret = process.env.NEXTAUTH_SECRET;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = await getToken({ req, secret });

  if (!token || token.role !== 'MANAGER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { status } = await req.json();

  if (!['APPROVED', 'DECLINED'].includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  const updatedRequest = await prisma.leaveRequest.update({
    where: { id: params.id },
    data: { status },
  });

  return NextResponse.json(updatedRequest);
}
