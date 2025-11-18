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
  
  // Mock app/lib/prisma only if DATABASE_URL is not properly configured
  if (request.includes("app/lib/prisma") || request.includes("lib/prisma")) {
    // Check if we have a real database connection available
    const hasRealDatabase = process.env.DATABASE_URL && 
                           !process.env.DATABASE_URL.includes('test:test@localhost');
    
    // If we have a real database, use the actual Prisma client
    if (hasRealDatabase) {
      return originalLoad(request, parent, isMain);
    }
    
    // Otherwise, return cached mock instance if it exists, or create it
    if (!cachedPrismaMock) {
      // In-memory data store for mocked Prisma operations
      const dataStore = new Map<string, Map<string, any>>();
      
      const getModelStore = (modelName: string) => {
        if (!dataStore.has(modelName)) {
          dataStore.set(modelName, new Map());
        }
        return dataStore.get(modelName)!;
      };
      
      // Create default mock methods with in-memory storage
      const createModelMock = (modelName: string) => ({
        findUnique: async ({ where }: any) => {
          const store = getModelStore(modelName);
          return store.get(where.id) || null;
        },
        findMany: async ({ where }: any = {}) => {
          const store = getModelStore(modelName);
          const allRecords = Array.from(store.values());
          
          if (!where) return allRecords;
          
          // Filter records based on where clause
          return allRecords.filter(record => {
            // Filter by id (exact match)
            if (where.id && typeof where.id === 'string' && record.id !== where.id) {
              return false;
            }
            // Filter by id: { in: [...] } syntax
            if (where.id && where.id.in && Array.isArray(where.id.in)) {
              if (!where.id.in.includes(record.id)) {
                return false;
              }
            }
            // Filter by companyId
            if (where.companyId && record.companyId !== where.companyId) {
              return false;
            }
            // Filter by templateId
            if (where.templateId && record.templateId !== where.templateId) {
              return false;
            }
            return true;
          });
        },
        findFirst: async ({ where }: any = {}) => {
          const results = await createModelMock(modelName).findMany({ where });
          return results[0] || null;
        },
        create: async ({ data, select }: any) => {
          const store = getModelStore(modelName);
          const record = {
            ...data,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
          };
          
          store.set(data.id, record);
          
          // If select is specified, only return selected fields
          if (select) {
            const selectedRecord: any = {};
            Object.keys(select).forEach(key => {
              if (select[key]) {
                // Handle relations - populate from other stores
                if (key === 'PublishedByUser' && record.publishedBy) {
                  const userStore = getModelStore('user');
                  selectedRecord[key] = userStore.get(record.publishedBy) || null;
                } else if (key === 'User' && record.updatedById) {
                  const userStore = getModelStore('user');
                  selectedRecord[key] = userStore.get(record.updatedById) || null;
                } else if (key === 'Department' || key === 'JobRole' || key === 'OnboardingStep') {
                  // Return empty arrays for relation fields
                  selectedRecord[key] = [];
                } else {
                  selectedRecord[key] = record[key];
                }
              }
            });
            return selectedRecord;
          }
          
          return record;
        },
        update: async ({ where, data, select }: any) => {
          const store = getModelStore(modelName);
          const existing = store.get(where.id);
          
          if (!existing) {
            throw new Error(`Record not found: ${where.id}`);
          }
          
          const updated = {
            ...existing,
            ...data,
            updatedAt: new Date(),
          };
          
          // Handle increment operations
          if (data.version && data.version.increment) {
            updated.version = (existing.version || 0) + data.version.increment;
          }
          
          store.set(where.id, updated);
          
          // If select is specified, only return selected fields
          if (select) {
            const selectedRecord: any = {};
            Object.keys(select).forEach(key => {
              if (select[key]) {
                // Handle relations - populate from other stores
                if (key === 'PublishedByUser' && updated.publishedBy) {
                  const userStore = getModelStore('user');
                  selectedRecord[key] = userStore.get(updated.publishedBy) || null;
                } else if (key === 'User' && updated.updatedById) {
                  const userStore = getModelStore('user');
                  selectedRecord[key] = userStore.get(updated.updatedById) || null;
                } else if (key === 'Department' || key === 'JobRole' || key === 'OnboardingStep') {
                  // Return empty arrays for relation fields
                  selectedRecord[key] = [];
                } else {
                  selectedRecord[key] = updated[key];
                }
              }
            });
            return selectedRecord;
          }
          
          return updated;
        },
        delete: async ({ where }: any) => {
          const store = getModelStore(modelName);
          const record = store.get(where.id);
          store.delete(where.id);
          return record || {};
        },
        deleteMany: async ({ where }: any = {}) => {
          const store = getModelStore(modelName);
          const allRecords = Array.from(store.values());
          let count = 0;
          
          allRecords.forEach(record => {
            let shouldDelete = true;
            
            if (where?.companyId && record.companyId !== where.companyId) {
              shouldDelete = false;
            }
            if (where?.templateId && record.templateId !== where.templateId) {
              shouldDelete = false;
            }
            
            if (shouldDelete) {
              store.delete(record.id);
              count++;
            }
          });
          
          return { count };
        },
        count: async ({ where }: any = {}) => {
          const results = await createModelMock(modelName).findMany({ where });
          return results.length;
        },
        createMany: async ({ data }: any) => {
          const store = getModelStore(modelName);
          const records = Array.isArray(data) ? data : [data];
          
          records.forEach(record => {
            const fullRecord = {
              ...record,
              createdAt: record.createdAt || new Date(),
              updatedAt: record.updatedAt || new Date(),
            };
            store.set(record.id, fullRecord);
          });
          
          return { count: records.length };
        },
      });
      
      // Use a Proxy that allows property mutations while providing defaults
      cachedPrismaMock = {
        prisma: new Proxy({}, {
          get: (target: any, prop: string) => {
            // Handle Prisma client methods (not model methods)
            if (prop === '$connect') {
              return async () => Promise.resolve();
            }
            if (prop === '$disconnect') {
              return async () => Promise.resolve();
            }
            if (prop === '$transaction') {
              return async (fn: any) => {
                if (typeof fn === 'function') {
                  return fn(cachedPrismaMock.prisma);
                }
                return Promise.all(fn);
              };
            }
            
            // Return custom mock if set, otherwise return model mock with in-memory storage
            if (target[prop]) {
              return target[prop];
            }
            return createModelMock(prop);
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
