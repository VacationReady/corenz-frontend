/**
 * Auth Cookie Utilities
 * 
 * Single source of truth for session cookie names across NextAuth v4 and v5.
 * This ensures consistent cookie handling during migration and prevents
 * silent login/logout/session inconsistencies.
 */

// NextAuth v5 (Auth.js) cookie names - these are the canonical names going forward
const V5_COOKIE_NAME = "authjs.session-token";
const V5_SECURE_COOKIE_NAME = "__Secure-authjs.session-token";

// NextAuth v4 legacy cookie names - kept for backward compatibility during migration
const V4_COOKIE_NAME = "next-auth.session-token";
const V4_SECURE_COOKIE_NAME = "__Secure-next-auth.session-token";

/**
 * Get the primary session cookie name for writing new sessions.
 * Always uses the v5 naming convention.
 */
export function getSessionCookieName(production: boolean): string {
  return production ? V5_SECURE_COOKIE_NAME : V5_COOKIE_NAME;
}

/**
 * Get all known session cookie names for reading/clearing.
 * Includes both v5 and legacy v4 names to handle migration scenarios.
 * 
 * @param production - Whether running in production mode
 * @returns Array of cookie names to check, ordered by preference (v5 first)
 */
export function getSessionCookieNames(production: boolean): string[] {
  if (production) {
    // In production, check secure variants first, then non-secure for cleanup
    return [
      V5_SECURE_COOKIE_NAME,    // New v5 secure (primary)
      V4_SECURE_COOKIE_NAME,    // Legacy v4 secure
      V5_COOKIE_NAME,           // v5 non-secure (shouldn't exist in prod, but check for cleanup)
      V4_COOKIE_NAME,           // v4 non-secure (shouldn't exist in prod, but check for cleanup)
    ];
  }
  
  // In development, non-secure variants
  return [
    V5_COOKIE_NAME,             // New v5 (primary)
    V4_COOKIE_NAME,             // Legacy v4
  ];
}

/**
 * Get all cookie names that should be cleared on signout.
 * Returns all known variants to ensure complete session cleanup.
 */
export function getAllSessionCookieNames(): string[] {
  return [
    V5_SECURE_COOKIE_NAME,
    V5_COOKIE_NAME,
    V4_SECURE_COOKIE_NAME,
    V4_COOKIE_NAME,
  ];
}

/**
 * Standard cookie options for session cookies.
 */
export function getSessionCookieOptions(production: boolean) {
  return {
    httpOnly: true,
    secure: production,
    sameSite: "lax" as const,
    path: "/",
  };
}

/**
 * Cookie options for clearing/expiring a cookie.
 */
export function getClearCookieOptions(production: boolean) {
  return {
    ...getSessionCookieOptions(production),
    maxAge: 0,
    expires: new Date(0),
  };
}

// Export constants for direct access if needed
export const COOKIE_NAMES = {
  V5: V5_COOKIE_NAME,
  V5_SECURE: V5_SECURE_COOKIE_NAME,
  V4: V4_COOKIE_NAME,
  V4_SECURE: V4_SECURE_COOKIE_NAME,
} as const;
