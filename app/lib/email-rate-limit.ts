/**
 * Email Rate Limiting
 * 
 * Provides rate limiting specifically for email sending operations.
 * Target: 10 emails per minute per user (as per security best practices).
 * 
 * This is separate from the general API rate limiting in proxy.ts,
 * which handles request-level rate limiting. This module handles
 * email-specific rate limiting to prevent abuse of email sending features.
 */

import { rateLimit, RateLimitOptions } from './rate-limit';

// Email rate limit configuration
const EMAIL_RATE_LIMIT: RateLimitOptions = {
  limit: 10, // 10 emails per window
  windowMs: 60000, // 1 minute window
};

/**
 * Check if a user has exceeded the email rate limit.
 * 
 * @param userId - The user ID to check rate limit for
 * @returns true if rate limit exceeded, false otherwise
 */
export async function isEmailRateLimited(userId: string): Promise<boolean> {
  const key = `email:${userId}`;
  return rateLimit(key, EMAIL_RATE_LIMIT);
}

/**
 * Check email rate limit and return detailed info.
 * 
 * @param userId - The user ID to check rate limit for
 * @returns Object with limited status and limit info
 */
export async function checkEmailRateLimit(userId: string): Promise<{
  limited: boolean;
  limit: number;
  windowMs: number;
}> {
  const limited = await isEmailRateLimited(userId);
  return {
    limited,
    limit: EMAIL_RATE_LIMIT.limit,
    windowMs: EMAIL_RATE_LIMIT.windowMs,
  };
}

/**
 * Rate limit error response for email endpoints.
 * Returns a standardized error object for 429 responses.
 */
export function getEmailRateLimitError() {
  return {
    error: 'Email rate limit exceeded',
    message: `You can send a maximum of ${EMAIL_RATE_LIMIT.limit} emails per minute. Please wait and try again.`,
    retryAfter: Math.ceil(EMAIL_RATE_LIMIT.windowMs / 1000),
  };
}
