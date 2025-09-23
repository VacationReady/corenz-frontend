export type MinimalUser = { role?: string | null } | null | undefined;
export type MinimalSession = { user?: { role?: string | null } | null } | null | undefined;

function extractRole(input: MinimalUser | MinimalSession): string | null {
  if (!input) return null;
  // Session-like shape
  if (typeof (input as any).user !== "undefined") {
    return ((input as any).user?.role as string | undefined) ?? null;
  }
  // User-like shape
  return ((input as any).role as string | undefined) ?? null;
}

export function isAdmin(input: MinimalUser | MinimalSession): boolean {
  const role = extractRole(input);
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function isAdminOrManager(
  input: MinimalUser | MinimalSession,
): boolean {
  const role = extractRole(input);
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "MANAGER";
}


