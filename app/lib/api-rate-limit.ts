/**
 * API Rate Limiting
 * 
 * Provides rate limiting for API endpoints to prevent abuse.
 * Uses the same underlying rate-limit infrastructure as email rate limiting.
 * 
 * This is separate from the general request-level rate limiting in proxy.ts.
 * Use this for specific endpoints that need protection against enumeration
 * attacks or abuse (e.g., permission checks, password resets, etc.).
 */

import { rateLimit, RateLimitOptions } from './rate-limit';

/**
 * Check if a key has exceeded the rate limit.
 * 
 * @param key - Unique key for rate limiting (e.g., "permissions-check:userId")
 * @param maxRequests - Maximum number of requests allowed in the window
 * @param windowSeconds - Time window in seconds
 * @returns true if rate limit exceeded, false otherwise
 */
export async function isApiRateLimited(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const options: RateLimitOptions = {
    limit: maxRequests,
    windowMs: windowSeconds * 1000,
  };
  return rateLimit(key, options);
}

/**
 * Rate limit error response for API endpoints.
 * Returns a standardized error object for 429 responses.
 * 
 * @param retryAfterSeconds - Seconds until the rate limit resets
 */
export function getApiRateLimitError(retryAfterSeconds: number = 60) {
  return {
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please wait and try again.',
    retryAfter: retryAfterSeconds,
  };
}

/**
 * Pre-configured rate limits for common use cases
 */
export const API_RATE_LIMITS = {
  // Permission checks: 60 requests per minute per user
  // Prevents permission enumeration attacks
  PERMISSION_CHECK: { maxRequests: 60, windowSeconds: 60 },
  
  // Password reset: 5 requests per 15 minutes per IP/email
  // Prevents brute force attacks
  PASSWORD_RESET: { maxRequests: 5, windowSeconds: 900 },
  
  // Login attempts: 10 requests per 15 minutes per IP
  // Prevents credential stuffing
  LOGIN_ATTEMPT: { maxRequests: 10, windowSeconds: 900 },
  
  // General API: 100 requests per minute per user
  // General protection against abuse
  GENERAL: { maxRequests: 100, windowSeconds: 60 },
} as const;
