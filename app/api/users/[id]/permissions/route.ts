import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { hasPermission, resolvePermissions } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view permissions
    if (!hasPermission(session.user as any, 'permissions', 'read')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Get user with their current permission profile
    const user = await prisma.user.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        permissionProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get effective permissions
    const effectivePermissions = resolvePermissions(user as any);

    // Get audit trail
    const auditTrail = await prisma.permissionAudit.findMany({
      where: { employeeId: params.id },
      select: {
        id: true,
        changedAt: true,
        note: true,
        oldPermissions: true,
        newPermissions: true,
        changedBy: {
          select: { id: true, name: true, email: true },
        },
        oldProfile: {
          select: { id: true, name: true, description: true, builtIn: true },
        },
        newProfile: {
          select: { id: true, name: true, description: true, builtIn: true },
        },
      },
      orderBy: { changedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissionProfile: user.permissionProfile,
      },
      effectivePermissions,
      auditTrail,
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to manage permissions
    if (!hasPermission(session.user as any, 'permissions', 'edit')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { permissionProfileId, note } = body;

    // Validate that user exists and belongs to the same company
    const user = await prisma.user.findFirst({
      where: {
        id: params.id,
        companyId: session.user.companyId,
      },
      include: {
        permissionProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If setting a custom profile, validate it exists and belongs to the company
    if (permissionProfileId) {
      const profile = await prisma.permissionProfile.findFirst({
        where: {
          id: permissionProfileId,
          companyId: session.user.companyId,
        },
      });

      if (!profile) {
        return NextResponse.json({ error: 'Permission profile not found' }, { status: 404 });
      }
    }

    // Get old permissions for audit
    const oldPermissions = user.permissionProfile
      ? typeof user.permissionProfile.permissions === 'string'
        ? JSON.parse(user.permissionProfile.permissions as unknown as string)
        : (user.permissionProfile.permissions as any)
      : null;

    // Update user's permission profile
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: {
        permissionProfileId: permissionProfileId || null,
      },
      include: {
        permissionProfile: true,
      },
    });

    // Get new permissions for audit
    const newPermissions = updatedUser.permissionProfile
      ? typeof updatedUser.permissionProfile.permissions === 'string'
        ? JSON.parse(updatedUser.permissionProfile.permissions as unknown as string)
        : (updatedUser.permissionProfile.permissions as any)
      : null;

    // Create audit log entry
    await prisma.permissionAudit.create({
      data: {
        employeeId: params.id,
        changedById: session.user.id,
        oldProfileId: user.permissionProfileId,
        newProfileId: permissionProfileId,
        oldPermissions: oldPermissions ? JSON.parse(JSON.stringify(oldPermissions)) : undefined,
        newPermissions: newPermissions ? JSON.parse(JSON.stringify(newPermissions)) : undefined,
        note: note?.trim(),
      },
    });

    // Get effective permissions for response
    const effectivePermissions = resolvePermissions(updatedUser as any);

    // Get audit trail
    const auditTrail = await prisma.permissionAudit.findMany({
      where: { employeeId: params.id },
      select: {
        id: true,
        changedAt: true,
        note: true,
        oldPermissions: true,
        newPermissions: true,
        changedBy: {
          select: { id: true, name: true, email: true },
        },
        oldProfile: {
          select: { id: true, name: true, description: true, builtIn: true },
        },
        newProfile: {
          select: { id: true, name: true, description: true, builtIn: true },
        },
      },
      orderBy: { changedAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        permissionProfile: updatedUser.permissionProfile,
      },
      effectivePermissions,
      auditTrail,
    });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
