import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

// DELETE /api/rota-groups/[id]/requirements/[requirementId] - Delete single requirement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; requirementId: string }> }
) {
  try {
    const { id, requirementId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify rota group belongs to company
    const rotaGroup = await prisma.rotaGroup.findUnique({
      where: {
        id,
        companyId: session.user.companyId,
      },
    });

    if (!rotaGroup) {
      return NextResponse.json(
        { error: 'Rota group not found' },
        { status: 404 }
      );
    }

    // Delete the requirement
    await prisma.shiftRequirement.delete({
      where: {
        id: requirementId,
        rotaGroupId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift requirement:', error);
    return NextResponse.json(
      { error: 'Failed to delete requirement' },
      { status: 500 }
    );
  }
}
