import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const providers = await prisma.trainingProvider.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(providers);
}
