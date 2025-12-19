/**
 * Test Environment Setup
 * Loads environment variables for test execution
 */

import { createRequire } from "module";

// Load from parent directory's setupEnv if it exists
try {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const require = createRequire(import.meta.url);
  require("../setupEnv");
} catch (e) {
  // Fallback: Set minimal test environment
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  (process.env as any).NODE_ENV = "test";
  process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
}
