/**
 * Get the absolute logout callback URL
 * 
 * This ensures users are redirected to the production login page,
 * not stale Vercel preview deployments.
 */
export function getLogoutCallbackUrl(): string {
  // In production, use the configured app URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    // Remove trailing slash if present to avoid double slashes
    const baseUrl = appUrl.replace(/\/$/, "");
    return `${baseUrl}/login`;
  }
  
  // Fallback to current origin (works correctly on production domain)
  if (typeof window !== "undefined") {
    return `${window.location.origin}/login`;
  }
  
  // Server-side fallback
  return "/login";
}
