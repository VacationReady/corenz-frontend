import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const courses = await prisma.course.findMany({
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(courses);
}
