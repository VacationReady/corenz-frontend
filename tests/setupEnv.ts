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
import Module from "module";

// Polyfill crypto for test environment (Node.js < 19)
if (!globalThis.crypto) {
  (globalThis as any).crypto = webcrypto;
}

// CRITICAL: Mock Prisma BEFORE any modules import it
// This prevents "PrismaClientInitializationError" in CI without database
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  // Mock @prisma/client to prevent database connection attempts
  if (request === "@prisma/client") {
    return {
      PrismaClient: class MockPrismaClient {
        constructor() {
          console.warn("[setupEnv] Using mocked PrismaClient - no database connection");
        }
        $connect() { return Promise.resolve(); }
        $disconnect() { return Promise.resolve(); }
      },
    };
  }
  
  // Mock app/lib/prisma to return mock client
  if (request.includes("app/lib/prisma") || request.includes("lib/prisma")) {
    return {
      prisma: new Proxy({}, {
        get: () => ({
          findUnique: async () => null,
          findMany: async () => [],
          findFirst: async () => null,
          create: async () => ({}),
          update: async () => ({}),
          delete: async () => ({}),
          count: async () => 0,
        }),
      }),
      getPrismaClient: () => null, // For public-holiday-checker.ts
    };
  }
  
  return originalLoad(request, parent, isMain);
};

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
