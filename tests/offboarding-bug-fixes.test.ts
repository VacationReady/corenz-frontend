import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const originalLoad = (Module as any)._load;

// Helper to clear module cache for fresh imports
function clearModuleCache(modulePath: string) {
  const fullPath = require.resolve(modulePath);
  delete require.cache[fullPath];
  // Also clear any cached dependencies
  Object.keys(require.cache).forEach(key => {
    if (key.includes('offboarding') || key.includes('exit-interview')) {
      delete require.cache[key];
    }
  });
}

/**
 * Test suite for offboarding bug fixes:
 * 1. Race condition in task completion
 * 2. Exit interview token expiration
 * 3. Asset return tracking
 */

test("Bug Fix 1: Race condition - updateMany prevents duplicate completion", async () => {
  let updateManyCallCount = 0;
  let emailSendCount = 0;

  const mockPrisma = {
    offboardingTask: {
      findUnique: async () => ({
        id: "task-1",
        offboardingId: "offboarding-1",
        isRequired: true,
        completedAt: null,
        EmployeeOffboarding: {
          id: "offboarding-1",
          employeeId: "emp-1",
          status: "COMPLETED", // Already completed
          Employee: { companyId: "company-1" },
        },
      }),
      findMany: async () => [
        { id: "task-1", isRequired: true, completedAt: new Date() },
        { id: "task-2", isRequired: true, completedAt: new Date() },
      ],
      update: async () => ({ id: "task-1", completedAt: new Date() }),
    },
    employeeOffboarding: {
      updateMany: async ({ where }: any) => {
        updateManyCallCount++;
        // Simulate: status is already COMPLETED, so no rows match IN_PROGRESS
        if (where.status === "IN_PROGRESS") {
          return { count: 0 };
        }
        return { count: 1 };
      },
    },
    employee: {
      update: async () => ({}),
    },
  };

  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "@/lib/prisma") {
      return { prisma: mockPrisma };
    }
    if (request === "@/lib/auth-options") {
      return {
        auth: async () => ({
          user: { id: "user-1", companyId: "company-1", role: "ADMIN" },
        }),
      };
    }
    if (request === "@/lib/email/send") {
      return {
        sendOffboardingCompletionSummaryEmail: async () => {
          emailSendCount++;
          return true;
        },
      };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    clearModuleCache("../app/api/offboarding/tasks/[id]/route");
    
    const { PATCH } = await import("../app/api/offboarding/tasks/[id]/route");
    const req = {
      json: async () => ({ completed: true }),
    } as any;
    
    await PATCH(req, { params: Promise.resolve({ id: "task-1" }) });
    
    // updateMany should have been called
    assert.equal(updateManyCallCount, 1, "updateMany should be called once");
    // Email should NOT be sent because count was 0 (status was already COMPLETED)
    assert.equal(emailSendCount, 0, "Email should not be sent when status already COMPLETED");
  } finally {
    (Module as any)._load = originalLoad;
  }
});

test("Bug Fix 2: Exit interview token expiration - expired token returns 410", async () => {
  const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago

  const mockPrisma = {
    employeeOffboarding: {
      findFirst: async () => ({
        id: "offboarding-1",
        completionTokenHash: "valid-token",
        tokenExpiresAt: expiredDate,
        completionStatus: "PENDING",
        Employee: {
          User: { firstName: "John", lastName: "Doe", companyId: "company-1" },
        },
        ExitInterviewFormTemplate: null,
      }),
    },
  };

  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "@/lib/prisma") {
      return { prisma: mockPrisma };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    clearModuleCache("../app/api/exit-interview/start/route");
    
    const { POST } = await import("../app/api/exit-interview/start/route");
    const req = {
      json: async () => ({ token: "valid-token" }),
    } as any;
    
    const res = await POST(req);
    assert.equal(res.status, 410, "Should return 410 Gone for expired token");
    
    const body = await res.json();
    assert.ok(body.error.includes("expired"), "Error message should mention expiration");
  } finally {
    (Module as any)._load = originalLoad;
  }
});

test("Bug Fix 2: Exit interview submit - expired token returns 410", async () => {
  const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const mockPrisma = {
    employeeOffboarding: {
      findFirst: async () => ({
        id: "offboarding-1",
        completionTokenHash: "valid-token",
        tokenExpiresAt: expiredDate,
        completionStatus: "STARTED",
        formTemplateId: "template-1",
        Employee: {
          companyId: "company-1",
          User: { email: "john@example.com" },
        },
      }),
    },
  };

  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "@/lib/prisma") {
      return { prisma: mockPrisma };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    clearModuleCache("../app/api/exit-interview/submit/route");
    
    const { POST } = await import("../app/api/exit-interview/submit/route");
    const req = {
      json: async () => ({ token: "valid-token", answersJson: {} }),
    } as any;
    
    const res = await POST(req);
    assert.equal(res.status, 410, "Should return 410 Gone for expired token");
  } finally {
    (Module as any)._load = originalLoad;
  }
});

test("Bug Fix 3: Asset return tracking - assetsReturnedTo is set", async () => {
  let capturedUpdateData: any = null;

  const mockPrisma = {
    employeeOffboarding: {
      findUnique: async () => ({
        id: "offboarding-1",
        employeeId: "emp-1",
        Employee: { companyId: "company-1" },
      }),
      update: async ({ data }: any) => {
        capturedUpdateData = data;
        return {};
      },
    },
  };

  (Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "@/lib/prisma") {
      return { prisma: mockPrisma };
    }
    if (request === "@/lib/auth-options") {
      return {
        auth: async () => ({
          user: { id: "user-123", companyId: "company-1", role: "ADMIN" },
        }),
      };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    clearModuleCache("../app/api/offboarding/[employeeId]/route");
    
    const { PATCH } = await import("../app/api/offboarding/[employeeId]/route");
    const req = {
      json: async () => ({
        assetsToReturn: [
          { name: "Laptop", returned: true },
          { name: "Badge", returned: true },
        ],
      }),
    } as any;
    
    await PATCH(req, { params: Promise.resolve({ employeeId: "emp-1" }) });
    
    assert.ok(capturedUpdateData, "Update should have been called");
    assert.equal(capturedUpdateData.assetsReturned, true, "assetsReturned should be true");
    assert.equal(capturedUpdateData.assetsReturnedTo, "user-123", "assetsReturnedTo should be set to current user");
    assert.ok(capturedUpdateData.assetsReturnedAt instanceof Date, "assetsReturnedAt should be set");
  } finally {
    (Module as any)._load = originalLoad;
  }
});
