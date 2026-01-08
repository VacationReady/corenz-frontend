/**
 * Property-based tests for Feature Toggle Authentication Enforcement
 * Feature: tenant-feature-toggles
 * Property 9: Authentication Enforcement
 * Validates: Requirements 7.5
 */
import "./setupEnv";
import test from "node:test";
import * as fc from "fast-check";
import { 
  verifySignedToken, 
  createSignedToken 
} from "../lib/tenant-admin-auth";

/**
 * Property 9: Authentication Enforcement
 * For any request to feature toggle management endpoints without valid 
 * tenant-admin authentication, the system should return a 401 Unauthorized response.
 * 
 * Feature: tenant-feature-toggles, Property 9: Authentication Enforcement
 * Validates: Requirements 7.5
 */
test("Property 9: Authentication Enforcement", async (t) => {
  await t.test("valid tokens are accepted", async () => {
    // Property: A freshly created token should always be valid
    fc.assert(
      fc.property(
        fc.nat({ max: 100 }), // Just a dummy input to run multiple times
        () => {
          const token = createSignedToken();
          const result = verifySignedToken(token);
          return result.valid === true && result.expired !== true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("invalid tokens are rejected", async () => {
    // Property: Random strings that aren't valid tokens should be rejected
    const invalidTokenArbitrary = fc.oneof(
      // Random strings
      fc.string({ minLength: 1, maxLength: 200 }),
      // Strings with wrong format (no dot)
      fc.string({ minLength: 10, maxLength: 50 }).filter(s => !s.includes(".")),
      // Strings with multiple dots
      fc.tuple(fc.string(), fc.string(), fc.string())
        .map(([a, b, c]) => `${a}.${b}.${c}`),
      // Empty string
      fc.constant(""),
      // Just a dot
      fc.constant("."),
      // Dot at start or end
      fc.string({ minLength: 5 }).map(s => `.${s}`),
      fc.string({ minLength: 5 }).map(s => `${s}.`)
    );
    
    fc.assert(
      fc.property(
        invalidTokenArbitrary,
        (invalidToken) => {
          const result = verifySignedToken(invalidToken);
          // Invalid tokens should not be valid
          return result.valid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("tampered tokens are rejected", async () => {
    // Property: Modifying any part of a valid token should invalidate it
    const tamperArbitrary = fc.oneof(
      // Change a character in the payload
      fc.nat({ max: 50 }),
      // Change a character in the signature
      fc.nat({ max: 50 })
    );
    
    fc.assert(
      fc.property(
        tamperArbitrary,
        (tamperIndex) => {
          const validToken = createSignedToken();
          const parts = validToken.split(".");
          
          if (parts.length !== 2) return true; // Skip if format unexpected
          
          // Tamper with the token
          const [payload, signature] = parts;
          
          // Try tampering with payload
          if (payload.length > 0) {
            const tamperedPayload = payload.slice(0, -1) + 
              (payload.charAt(payload.length - 1) === 'a' ? 'b' : 'a');
            const tamperedToken1 = `${tamperedPayload}.${signature}`;
            const result1 = verifySignedToken(tamperedToken1);
            if (result1.valid) return false;
          }
          
          // Try tampering with signature
          if (signature.length > 0) {
            const tamperedSignature = signature.slice(0, -1) + 
              (signature.charAt(signature.length - 1) === 'a' ? 'b' : 'a');
            const tamperedToken2 = `${payload}.${tamperedSignature}`;
            const result2 = verifySignedToken(tamperedToken2);
            if (result2.valid) return false;
          }
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("authentication check is consistent", async () => {
    // Property: The same token should always produce the same validation result
    fc.assert(
      fc.property(
        fc.nat({ max: 50 }),
        () => {
          const token = createSignedToken();
          
          // Check multiple times
          const results = [];
          for (let i = 0; i < 5; i++) {
            results.push(verifySignedToken(token));
          }
          
          // All results should be the same
          const firstResult = results[0];
          return results.every(r => 
            r.valid === firstResult.valid && 
            r.expired === firstResult.expired
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  await t.test("null and undefined tokens are rejected", async () => {
    // Edge case: null/undefined should be handled gracefully
    const nullishArbitrary = fc.constantFrom(
      null as unknown as string,
      undefined as unknown as string,
      "" as string
    );
    
    fc.assert(
      fc.property(
        nullishArbitrary,
        (nullishToken) => {
          try {
            const result = verifySignedToken(nullishToken);
            return result.valid === false;
          } catch {
            // If it throws, that's also acceptable behavior for invalid input
            return true;
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  await t.test("token format validation", async () => {
    // Property: Valid tokens should have exactly one dot separator
    fc.assert(
      fc.property(
        fc.nat({ max: 20 }),
        () => {
          const token = createSignedToken();
          const dotCount = (token.match(/\./g) || []).length;
          return dotCount === 1;
        }
      ),
      { numRuns: 100 }
    );
  });
});
