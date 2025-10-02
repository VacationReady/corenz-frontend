/**
 * OpenAI Client Configuration
 * Centralized OpenAI setup with error handling and rate limiting
 */

import OpenAI from "openai";

// Initialize OpenAI client
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default model configuration
export const AI_CONFIG = {
  model: process.env.OPENAI_MODEL || "gpt-4-turbo-preview",
  temperature: parseFloat(process.env.OPENAI_TEMPERATURE || "0.7"),
  maxTokens: 4096,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

// Check if AI features are enabled
export function isAIEnabled(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

// Validate API key format
export function validateAPIKey(): { valid: boolean; error?: string } {
  if (!process.env.OPENAI_API_KEY) {
    return {
      valid: false,
      error: "OPENAI_API_KEY not set. Add it to your .env.local file.",
    };
  }

  if (!process.env.OPENAI_API_KEY.startsWith("sk-")) {
    return {
      valid: false,
      error: "Invalid OPENAI_API_KEY format. Should start with 'sk-'.",
    };
  }

  return { valid: true };
}

// Rate limiting in-memory store (use Redis in production)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  limit: number = 100,
  windowMs: number = 3600000
): { allowed: boolean; remaining: number; resetAt: number } {
  // If no API key configured, skip rate limiting (development mode)
  if (!process.env.OPENAI_API_KEY) {
    return { allowed: true, remaining: limit, resetAt: Date.now() + windowMs };
  }

  const now = Date.now();
  const userLimit = requestCounts.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    const resetAt = now + windowMs;
    requestCounts.set(userId, { count: 1, resetAt });
    return { allowed: true, remaining: limit - 1, resetAt };
  }

  if (userLimit.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: userLimit.resetAt,
    };
  }

  userLimit.count++;
  return {
    allowed: true,
    remaining: limit - userLimit.count,
    resetAt: userLimit.resetAt,
  };
}

// Cleanup old rate limit entries (run periodically)
export function cleanupRateLimits() {
  const now = Date.now();
  for (const [userId, data] of requestCounts.entries()) {
    if (now > data.resetAt) {
      requestCounts.delete(userId);
    }
  }
}

