/**
 * Email Rate Limiting Tests
 * 
 * Tests the email rate limiting functionality that limits users to
 * 10 emails per minute to prevent abuse of email sending features.
 */

import assert from "node:assert";
import { test, describe, beforeEach } from "node:test";
import {
  isEmailRateLimited,
  checkEmailRateLimit,
  getEmailRateLimitError,
} from "../app/lib/email-rate-limit";

describe("Email Rate Limiting", () => {
  // Use unique user IDs per test to avoid cross-test interference
  let testUserId: string;
  
  beforeEach(() => {
    testUserId = `test-user-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  });

  test("isEmailRateLimited returns false when under limit", async () => {
    // First call should not be rate limited
    const result = await isEmailRateLimited(testUserId);
    assert.strictEqual(result, false);
  });

  test("isEmailRateLimited returns true when over limit", async () => {
    // Make 10 calls (the limit)
    for (let i = 0; i < 10; i++) {
      await isEmailRateLimited(testUserId);
    }
    
    // 11th call should be rate limited
    const result = await isEmailRateLimited(testUserId);
    assert.strictEqual(result, true);
  });

  test("checkEmailRateLimit returns detailed info when under limit", async () => {
    const result = await checkEmailRateLimit(testUserId);
    
    assert.strictEqual(result.limited, false);
    assert.strictEqual(result.limit, 10);
    assert.strictEqual(result.windowMs, 60000);
  });

  test("checkEmailRateLimit returns detailed info when over limit", async () => {
    // Exhaust the limit
    for (let i = 0; i < 10; i++) {
      await checkEmailRateLimit(testUserId);
    }
    
    const result = await checkEmailRateLimit(testUserId);
    
    assert.strictEqual(result.limited, true);
    assert.strictEqual(result.limit, 10);
    assert.strictEqual(result.windowMs, 60000);
  });

  test("getEmailRateLimitError returns correct error structure", () => {
    const error = getEmailRateLimitError();
    
    assert.strictEqual(error.error, "Email rate limit exceeded");
    assert.ok(error.message.includes("10 emails per minute"));
    assert.strictEqual(error.retryAfter, 60);
  });

  test("different users have independent rate limits", async () => {
    const user1 = `user1-${Date.now()}`;
    const user2 = `user2-${Date.now()}`;
    
    // Exhaust user1's limit
    for (let i = 0; i < 10; i++) {
      await isEmailRateLimited(user1);
    }
    
    // User1 should be rate limited
    const user1Limited = await isEmailRateLimited(user1);
    assert.strictEqual(user1Limited, true);
    
    // User2 should NOT be rate limited
    const user2Limited = await isEmailRateLimited(user2);
    assert.strictEqual(user2Limited, false);
  });

  test("rate limit allows exactly 10 requests", async () => {
    let limitedCount = 0;
    
    // Make 15 requests
    for (let i = 0; i < 15; i++) {
      const limited = await isEmailRateLimited(testUserId);
      if (limited) limitedCount++;
    }
    
    // First 10 should pass, last 5 should be limited
    assert.strictEqual(limitedCount, 5);
  });
});
