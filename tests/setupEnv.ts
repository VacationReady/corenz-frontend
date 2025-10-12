/**
 * Test environment setup
 * 
 * Injects validated mock environment variables for tests.
 * Import this file at the top of test files that depend on env vars.
 * 
 * Usage in tests:
 * ```ts
 * import './setupEnv'; // Must be before any imports that use env
 * ```
 */

import { webcrypto } from "crypto";

// Polyfill crypto for test environment (Node.js < 19)
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// Set test environment variables before any modules load
process.env.NODE_ENV = "test";
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/testdb";
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret-min-32-chars-required-for-security";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
process.env.FROM_EMAIL = process.env.FROM_EMAIL || "test@example.com";
process.env.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX || "120";
process.env.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS || "60000";
process.env.OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4-turbo-preview";
process.env.OPENAI_TEMPERATURE = process.env.OPENAI_TEMPERATURE || "0.7";
process.env.UNIFIED_AUDIT_DUALWRITE = process.env.UNIFIED_AUDIT_DUALWRITE || "true";
process.env.PASSWORD_RESET_LIMIT = process.env.PASSWORD_RESET_LIMIT || "3";
process.env.PASSWORD_RESET_WINDOW_MS = process.env.PASSWORD_RESET_WINDOW_MS || "900000";

export {};
