/**
 * Standardized authentication for Vercel Cron jobs
 * 
 * Vercel automatically adds the CRON_SECRET in the Authorization header
 * when calling cron endpoints. This helper standardizes the verification.
 */

import { NextRequest } from "next/server";

/**
 * Verify that a cron request is legitimate
 * Checks for CRON_SECRET in Authorization header or x-cron-secret header
 * 
 * @param req - The incoming request
 * @returns true if authorized, false otherwise
 */
export function verifyCronSecret(req: NextRequest | Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  // If no secret is configured, allow in development but warn
  if (!cronSecret) {
    if (process.env.NODE_ENV === "development") {
      console.warn("⚠️ CRON_SECRET not set - allowing in development");
      return true;
    }
    // In production without a secret, reject for safety
    console.error("❌ CRON_SECRET not set in production!");
    return false;
  }

  // Check Authorization header (Bearer token format)
  const authHeader = req.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Check x-cron-secret header (alternative format)
  const cronHeader = req.headers.get("x-cron-secret");
  if (cronHeader === cronSecret) {
    return true;
  }

  // Vercel also sends the secret in the Authorization header without "Bearer"
  if (authHeader === cronSecret) {
    return true;
  }

  return false;
}

/**
 * Get an error response for unauthorized cron requests
 */
export function getUnauthorizedResponse() {
  return new Response(
    JSON.stringify({ error: "Unauthorized" }),
    { 
      status: 401,
      headers: { "Content-Type": "application/json" }
    }
  );
}















