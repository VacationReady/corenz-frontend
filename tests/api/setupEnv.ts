/**
 * Test Environment Setup
 * Loads environment variables for test execution
 */

// Load from parent directory's setupEnv if it exists
try {
  require("../setupEnv");
} catch (e) {
  // Fallback: Set minimal test environment
  process.env.NODE_ENV = "test";
  process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing-only";
  process.env.NEXTAUTH_URL = "http://localhost:3000";
}
