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

// CRITICAL: Mock server-only modules BEFORE any imports
// This prevents errors in test environment
const originalLoad = (Module as any)._load;

// Cache mocked modules to ensure all imports get the same instance
let cachedPrismaMock: any = null;

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  // Mock server-only package (throws in non-server contexts)
  if (request === "server-only") {
    return {}; // Empty module - does nothing
  }
  
  // Mock @prisma/client to prevent database connection attempts
  if (request === "@prisma/client") {
    // Mock Prisma enums that tests might reference
    const AutomationJobStatus = { PENDING: 'PENDING', RUNNING: 'RUNNING', COMPLETED: 'COMPLETED', FAILED: 'FAILED' };
    const ApprovalStatus = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' };
    const OnboardingStepType = {
      ACKNOWLEDGE_DOCUMENT: 'ACKNOWLEDGE_DOCUMENT',
      UPLOAD_DOCUMENT: 'UPLOAD_DOCUMENT',
      INSTRUCTION: 'INSTRUCTION',
      FORM_FILL: 'FORM_FILL',
      COLLECT_DOCUMENT: 'COLLECT_DOCUMENT',
      FILL_FORM_BY_SLUG: 'FILL_FORM_BY_SLUG',
      CREATE_TASK: 'CREATE_TASK',
      TRAINING_ASSIGNMENT: 'TRAINING_ASSIGNMENT',
      EQUIPMENT_CHECKLIST: 'EQUIPMENT_CHECKLIST',
      SYSTEM_ACCESS: 'SYSTEM_ACCESS',
      MANAGER_CHECKIN: 'MANAGER_CHECKIN',
      BUDDY_INTRODUCTION: 'BUDDY_INTRODUCTION',
      COMPLIANCE_TRAINING: 'COMPLIANCE_TRAINING',
      PAYROLL_SETUP: 'PAYROLL_SETUP',
      BENEFITS_ENROLLMENT: 'BENEFITS_ENROLLMENT',
      PROBATION_GOALS: 'PROBATION_GOALS',
      WELCOME_SURVEY: 'WELCOME_SURVEY',
      JOURNEY_AUTOMATION: 'JOURNEY_AUTOMATION',
    };
    const OnboardingUploadType = {
      PASSPORT: 'PASSPORT',
      RIGHT_TO_WORK: 'RIGHT_TO_WORK',
      DRIVER_LICENSE: 'DRIVER_LICENSE',
      TRAINING_CERTIFICATE: 'TRAINING_CERTIFICATE',
      OTHER: 'OTHER',
    };
    
    return {
      PrismaClient: class MockPrismaClient {
        constructor() {
          console.warn("[setupEnv] Using mocked PrismaClient - no database connection");
        }
        $connect() { return Promise.resolve(); }
        $disconnect() { return Promise.resolve(); }
      },
      // Export commonly used enums
      AutomationJobStatus,
      ApprovalStatus,
      OnboardingStepType,
      OnboardingUploadType,
      Prisma: {
        AutomationJobStatus,
        ApprovalStatus,
        OnboardingStepType,
        OnboardingUploadType,
      },
    };
  }
  
  // Mock app/lib/prisma to return mock client
  if (request.includes("app/lib/prisma") || request.includes("lib/prisma")) {
    // Return cached instance if it exists, otherwise create it
    if (!cachedPrismaMock) {
      // Create default mock methods
      const defaultMock = {
        findUnique: async () => null,
        findMany: async () => [],
        findFirst: async () => null,
        create: async () => ({}),
        update: async () => ({}),
        delete: async () => ({}),
        count: async () => 0,
        createMany: async () => ({ count: 0 }),
      };
      
      // Use a Proxy that allows property mutations while providing defaults
      cachedPrismaMock = {
        prisma: new Proxy({}, {
          get: (target: any, prop: string) => {
            // Return custom mock if set, otherwise return default mock
            if (target[prop]) {
              return target[prop];
            }
            return { ...defaultMock };
          },
          set: (target: any, prop: string, value: any) => {
            // Allow tests to override specific models
            target[prop] = value;
            return true;
          },
        }),
        getPrismaClient: () => null, // For public-holiday-checker.ts
      };
    }
    return cachedPrismaMock;
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
