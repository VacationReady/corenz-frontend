import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get('employeeId');

  try {
    const licences = await prisma.driverLicence.findMany({
      where: {
        employeeId: employeeId ?? undefined,
        employee: {
          is: {
            companyId: session.user.companyId,
          },
        },
      },
      include: {
        document: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(licences);
  } catch (error) {
    console.error('Error fetching driver licences:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
