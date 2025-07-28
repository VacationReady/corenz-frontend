import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { documentId, canViewAdmin, canViewManager, canViewEmployee, departmentIds, jobRoleIds } = await req.json();

  if (!documentId) {
    return NextResponse.json({ error: 'Missing documentId' }, { status: 400 });
  }

  try {
    // Update access flags and reset department/job role M:N relations
    const updatedDoc = await prisma.document.update({
      where: { id: documentId },
      data: {
        canViewAdmin,
        canViewManager,
        canViewEmployee,
        departments: {
          set: departmentIds?.map((id: string) => ({ id })) || [], // Clear if empty
        },
        jobRoles: {
          set: jobRoleIds?.map((id: string) => ({ id })) || [], // Clear if empty
        },
      },
      include: {
        departments: true,
        jobRoles: true,
      },
    });

    return NextResponse.json(updatedDoc);
  } catch (err) {
    console.error('Update Access Error:', err);
    return NextResponse.json({ error: 'Failed to update document access' }, { status: 500 });
  }
}
