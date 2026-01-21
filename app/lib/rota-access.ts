import { prisma } from "@/lib/prisma";
import { hasPermission, UserWithProfile } from "./permissions";

/**
 * Rota access levels:
 * - 'none': No access to rota features
 * - 'group_manager': Can manage specific rota groups they are assigned to
 * - 'full_access': Full access to all rota groups (admin, manager role, or rota permission)
 */
export type RotaAccessLevel =
  | { type: "none" }
  | { type: "group_manager"; groupIds: string[]; groups: { id: string; name: string }[] }
  | { type: "full_access" };

export interface RotaAccessInfo {
  accessLevel: RotaAccessLevel;
  managedGroups: { id: string; name: string }[];
  memberGroups: { id: string; name: string }[];
}

/**
 * Determines the rota access level for a user.
 * 
 * Access hierarchy:
 * 1. ADMIN/SUPER_ADMIN role → full_access
 * 2. Has 'rota' permission via custom profile → full_access
 * 3. MANAGER role → full_access (they manage their team's rotas)
 * 4. Is a RotaGroupManager → group_manager with list of managed group IDs
 * 5. Otherwise → none
 */
export async function getRotaAccessLevel(userId: string): Promise<RotaAccessLevel> {
  // Get user with their permission profile and employee record
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      PermissionProfile: true,
      Employee: {
        select: {
          id: true,
          ManagedRotaGroups: {
            include: {
              RotaGroup: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return { type: "none" };
  }

  // 1. ADMIN/SUPER_ADMIN always have full access
  if (["ADMIN", "SUPER_ADMIN"].includes(user.role)) {
    return { type: "full_access" };
  }

  // 2. Check for 'rota' permission via custom profile
  const userWithProfile: UserWithProfile = {
    ...user,
    permissionProfile: user.PermissionProfile,
  };

  if (hasPermission(userWithProfile, "rota", "read")) {
    return { type: "full_access" };
  }

  // 3. MANAGER role has full access (they manage their team)
  if (user.role === "MANAGER") {
    return { type: "full_access" };
  }

  // 4. Check if user is a RotaGroupManager
  const managedGroups = user.Employee?.ManagedRotaGroups || [];
  if (managedGroups.length > 0) {
    return {
      type: "group_manager",
      groupIds: managedGroups.map((mg) => mg.RotaGroup.id),
      groups: managedGroups.map((mg) => ({
        id: mg.RotaGroup.id,
        name: mg.RotaGroup.name,
      })),
    };
  }

  // 5. No rota access
  return { type: "none" };
}

/**
 * Gets full rota access information for a user including managed and member groups.
 */
export async function getRotaAccessInfo(userId: string): Promise<RotaAccessInfo> {
  const accessLevel = await getRotaAccessLevel(userId);

  // Get user's employee record for group memberships
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      Employee: {
        select: {
          id: true,
          ManagedRotaGroups: {
            include: {
              RotaGroup: {
                select: { id: true, name: true },
              },
            },
          },
          RotaGroupMemberships: {
            where: { isActive: true },
            include: {
              RotaGroup: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
    },
  });

  const managedGroups = (user?.Employee?.ManagedRotaGroups || []).map((mg) => ({
    id: mg.RotaGroup.id,
    name: mg.RotaGroup.name,
  }));

  const memberGroups = (user?.Employee?.RotaGroupMemberships || []).map((m) => ({
    id: m.RotaGroup.id,
    name: m.RotaGroup.name,
  }));

  return {
    accessLevel,
    managedGroups,
    memberGroups,
  };
}

/**
 * Checks if a user can manage a specific rota group.
 * Returns true if:
 * - User has full_access
 * - User is a group_manager for this specific group
 */
export async function canManageRotaGroup(
  userId: string,
  rotaGroupId: string
): Promise<boolean> {
  const accessLevel = await getRotaAccessLevel(userId);

  if (accessLevel.type === "full_access") {
    return true;
  }

  if (accessLevel.type === "group_manager") {
    return accessLevel.groupIds.includes(rotaGroupId);
  }

  return false;
}

/**
 * Checks if a user can view a specific rota group.
 * Returns true if:
 * - User has full_access
 * - User is a group_manager for this specific group
 * - User is a member of this specific group
 */
export async function canViewRotaGroup(
  userId: string,
  rotaGroupId: string
): Promise<boolean> {
  // First check management access
  if (await canManageRotaGroup(userId, rotaGroupId)) {
    return true;
  }

  // Check if user is a member
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      Employee: {
        select: {
          RotaGroupMemberships: {
            where: {
              rotaGroupId,
              isActive: true,
            },
          },
        },
      },
    },
  });

  return (user?.Employee?.RotaGroupMemberships?.length ?? 0) > 0;
}

/**
 * Gets the list of rota group IDs a user can manage.
 * For full_access users, returns null (meaning all groups).
 * For group_managers, returns the list of managed group IDs.
 * For others, returns empty array.
 */
export async function getManagedRotaGroupIds(
  userId: string
): Promise<string[] | null> {
  const accessLevel = await getRotaAccessLevel(userId);

  if (accessLevel.type === "full_access") {
    return null; // null means all groups
  }

  if (accessLevel.type === "group_manager") {
    return accessLevel.groupIds;
  }

  return [];
}
