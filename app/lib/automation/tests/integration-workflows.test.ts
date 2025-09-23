import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { AutomationJobStatus, AutomationTriggerType } from "@prisma/client";

// Mock database state for integration testing
let mockDatabase: any = {
  automationRules: [],
  automationJobs: [],
  automationExecutions: [],
  employees: [],
  employmentChecks: [],
  formSubmissions: [],
  onboardingInstances: [],
  onboardingStepInstances: [],
  users: [],
  globalAuditLogs: [],
};

// Helper to reset database state
const resetMockDatabase = () => {
  mockDatabase = {
    automationRules: [],
    automationJobs: [],
    automationExecutions: [],
    employees: [],
    employmentChecks: [],
    formSubmissions: [],
    onboardingInstances: [],
    onboardingStepInstances: [],
    users: [],
    globalAuditLogs: [],
  };
};

// Enhanced mock Prisma client with stateful behavior
const mockPrismaClient = {
  automationRule: {
    findMany: test.mock.fn(() => Promise.resolve(mockDatabase.automationRules)),
    findFirst: test.mock.fn((args: any) => {
      const rule = mockDatabase.automationRules.find(
        (r: any) =>
          r.id === args.where.id ||
          (args.where.companyId === r.companyId &&
            args.where.isActive === r.isActive),
      );
      return Promise.resolve(rule || null);
    }),
    create: test.mock.fn((args: any) => {
      const rule = { id: `rule-${Date.now()}`, ...args.data };
      mockDatabase.automationRules.push(rule);
      return Promise.resolve(rule);
    }),
  },
  automationJob: {
    create: test.mock.fn((args: any) => {
      const job = {
        id: `job-${Date.now()}`,
        ...args.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockDatabase.automationJobs.push(job);
      return Promise.resolve(job);
    }),
    findFirst: test.mock.fn((args: any) => {
      const job = mockDatabase.automationJobs.find((j: any) => {
        if (args.where.status && j.status !== args.where.status) return false;
        if (
          args.where.scheduledAt?.lte &&
          j.scheduledAt > args.where.scheduledAt.lte
        )
          return false;
        return true;
      });
      return Promise.resolve(job || null);
    }),
    update: test.mock.fn((args: any) => {
      const jobIndex = mockDatabase.automationJobs.findIndex(
        (j: any) => j.id === args.where.id,
      );
      if (jobIndex >= 0) {
        mockDatabase.automationJobs[jobIndex] = {
          ...mockDatabase.automationJobs[jobIndex],
          ...args.data,
          updatedAt: new Date(),
        };
        return Promise.resolve(mockDatabase.automationJobs[jobIndex]);
      }
      return Promise.resolve(null);
    }),
    count: test.mock.fn((args: any) => {
      const count = mockDatabase.automationJobs.filter((j: any) => {
        if (args.where.status && j.status !== args.where.status) return false;
        if (args.where.companyId && j.companyId !== args.where.companyId)
          return false;
        return true;
      }).length;
      return Promise.resolve(count);
    }),
  },
  automationExecution: {
    create: test.mock.fn((args: any) => {
      const execution = {
        id: `exec-${Date.now()}`,
        ...args.data,
        triggeredAt: new Date(),
      };
      mockDatabase.automationExecutions.push(execution);
      return Promise.resolve(execution);
    }),
  },
  employmentCheck: {
    findMany: test.mock.fn((args: any) => {
      let checks = mockDatabase.employmentChecks.filter((c: any) => {
        if (
          args.where.employee?.companyId &&
          c.employee.companyId !== args.where.employee.companyId
        )
          return false;
        if (
          args.where.expiryDate?.gte &&
          c.expiryDate < args.where.expiryDate.gte
        )
          return false;
        if (
          args.where.expiryDate?.lte &&
          c.expiryDate > args.where.expiryDate.lte
        )
          return false;
        return true;
      });
      return Promise.resolve(checks);
    }),
  },
  Employee: {
    findUnique: test.mock.fn((args: any) => {
      const employee = mockDatabase.employees.find(
        (e: any) => e.id === args.where.id,
      );
      return Promise.resolve(employee || null);
    }),
    findMany: test.mock.fn((args: any) => {
      let employees = mockDatabase.employees.filter((e: any) => {
        if (args.where.companyId && e.companyId !== args.where.companyId)
          return false;
        if (
          args.where.isActive !== undefined &&
          e.isActive !== args.where.isActive
        )
          return false;
        return true;
      });
      return Promise.resolve(employees);
    }),
  },
  User: {
    findMany: test.mock.fn((args: any) => {
      let users = mockDatabase.users.filter((u: any) => {
        if (args.where.companyId && u.companyId !== args.where.companyId)
          return false;
        if (args.where.role && u.role !== args.where.role) return false;
        return true;
      });
      return Promise.resolve(users);
    }),
  },
  globalAuditLog: {
    create: test.mock.fn((args: any) => {
      const log = {
        id: `audit-${Date.now()}`,
        ...args.data,
        timestamp: new Date(),
      };
      mockDatabase.globalAuditLogs.push(log);
      return Promise.resolve(log);
    }),
  },
  $transaction: test.mock.fn((fn: any) => {
    // Simple transaction mock - just execute the function
    return fn({
      automationJob: {
        findFirst: mockPrismaClient.automationJob.findFirst,
        update: mockPrismaClient.automationJob.update,
        fields: { maxAttempts: "maxAttempts" },
      },
    });
  }),
};

// Mock the prisma import
const originalLoad = (Module as any)._load;
(Module as any)._load = function (
  request: string,
  parent: any,
  isMain: boolean,
) {
  if (request === "@/lib/prisma") {
    return { prisma: mockPrismaClient };
  }
  return originalLoad.call(this, request, parent, isMain);
};

test("Automation Workflow Integration Tests", async (t) => {
  await t.test("Complete document expiry workflow", async () => {
    resetMockDatabase();

    // Setup test data
    const companyId = "company-123";
    const employeeId = "emp-456";

    // Add employee with expiring document
    mockDatabase.employees.push({
      id: employeeId,
      companyId,
      isActive: true,
      userId: "user-456",
      User: {
        id: "user-456",
        email: "employee@example.com",
        managerId: "manager-789",
      },
    });

    mockDatabase.users.push({
      id: "manager-789",
      email: "manager@example.com",
      role: "MANAGER",
      companyId,
    });

    // Add expiring employment check
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 15); // Expires in 15 days

    mockDatabase.employmentChecks.push({
      id: "check-123",
      employeeId,
      typeOfCheck: "Passport",
      expiryDate,
      Employee: {
        companyId,
        isActive: true,
        User: { id: "user-456", email: "employee@example.com" },
      },
    });

    // Create automation rule
    const automationRule = {
      id: "rule-doc-expiry",
      companyId,
      name: "Document Expiry Alert",
      isActive: true,
      triggerType: AutomationTriggerType.DOCUMENT_EXPIRING,
      triggerConfig: { daysBefore: 30 },
      conditions: [
        {
          type: "role",
          config: { operator: "in", value: ["EMPLOYEE", "MANAGER"] },
        },
      ],
      actions: [
        {
          type: "create_task",
          config: {
            title: "Renew Document",
            description: "Document expiring soon",
            assigneeType: "manager",
            dueDays: 7,
          },
        },
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Document Expiry Alert",
            message: "Your document is expiring soon",
          },
        },
      ],
      createdBy: "admin-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDatabase.automationRules.push(automationRule);

    // Import components
    const { AutomationRuleEvaluator } = await import(
      "../evaluator"
    );
    const { AutomationJobQueue } = await import("../queue");
    const { AutomationActionExecutor } = await import(
      "../executor"
    );

    // Step 1: Evaluate trigger
    const evaluator = new AutomationRuleEvaluator();
    const triggerResult = await evaluator.evaluateTrigger(
      AutomationTriggerType.DOCUMENT_EXPIRING,
      { daysBefore: 30 },
      companyId,
    );

    assert.strictEqual(triggerResult.matches, true);
    assert.strictEqual(triggerResult.matchingEntities.length, 1);
    assert.strictEqual(
      triggerResult.matchingEntities[0].type,
      "document_expiry",
    );

    // Step 2: Create job in queue
    const queue = new AutomationJobQueue();
    const jobId = await queue.enqueue(
      automationRule.id,
      companyId,
      triggerResult.matchingEntities[0],
    );

    assert.ok(jobId);
    assert.strictEqual(mockDatabase.automationJobs.length, 1);
    assert.strictEqual(
      mockDatabase.automationJobs[0].status,
      AutomationJobStatus.PENDING,
    );

    // Step 3: Process job (dequeue and execute)
    const job = await queue.dequeue("worker-test");
    assert.ok(job);
    assert.strictEqual(job.status, AutomationJobStatus.RUNNING);

    // Step 4: Evaluate conditions
    const employee = mockDatabase.employees[0];
    const conditionsPass = await evaluator.evaluateConditions(
      automationRule.conditions,
      {
        companyId,
        triggerData: triggerResult.matchingEntities[0],
        employeeId,
        Employee: {
          ...employee,
          User: { ...employee.user, role: "EMPLOYEE" }, // Set role for condition evaluation
        },
      },
    );

    assert.strictEqual(conditionsPass, true);

    // Step 5: Execute actions
    const executor = new AutomationActionExecutor();
    const actionResults = await executor.executeActions(
      automationRule.actions,
      {
        companyId,
        triggerData: triggerResult.matchingEntities[0],
        employeeId,
        logger: {
          info: () => {},
          warn: () => {},
          error: () => {},
          debug: () => {},
        },
      },
    );

    assert.strictEqual(actionResults.length, 2);
    assert.strictEqual(actionResults[0].success, true); // Task creation
    assert.strictEqual(actionResults[1].success, true); // Notification

    // Step 6: Complete job
    await queue.complete(job.id, { actionResults }, "worker-test");

    const completedJob = mockDatabase.automationJobs.find(
      (j: any) => j.id === job.id,
    );
    assert.strictEqual(completedJob.status, AutomationJobStatus.COMPLETED);
    assert.ok(completedJob.completedAt);

    // Verify audit trail
    assert.ok(mockDatabase.automationExecutions.length > 0);
  });

  await t.test("Form submission workflow with conditions", async () => {
    resetMockDatabase();

    const companyId = "company-456";
    const employeeId = "emp-789";

    // Setup employee in engineering department
    mockDatabase.employees.push({
      id: employeeId,
      companyId,
      isActive: true,
      departmentId: "dept-engineering",
      userId: "user-789",
      User: {
        id: "user-789",
        email: "engineer@example.com",
        role: "EMPLOYEE",
      },
    });

    // Create automation rule with department condition
    const automationRule = {
      id: "rule-form-submit",
      companyId,
      name: "Engineering Form Submission",
      isActive: true,
      triggerType: AutomationTriggerType.FORM_SUBMITTED,
      triggerConfig: { formId: "form-tech-request" },
      conditions: [
        {
          type: "department",
          config: { operator: "equals", value: ["dept-engineering"] },
        },
      ],
      actions: [
        {
          type: "create_task",
          config: {
            title: "Review Tech Request",
            assigneeType: "hr",
            dueDays: 3,
          },
        },
      ],
      createdBy: "admin-456",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDatabase.automationRules.push(automationRule);

    // Add HR user
    mockDatabase.users.push({
      id: "hr-123",
      email: "hr@example.com",
      role: "ADMIN",
      companyId,
    });

    // Simulate form submission trigger
    const { AutomationScheduler } = await import(
      "../scheduler"
    );
    const scheduler = new AutomationScheduler();

    await scheduler.handleEvent("form.submitted", {
      formId: "form-tech-request",
      employeeId,
      submissionId: "sub-123",
      companyId,
    });

    // Verify job was created
    assert.strictEqual(mockDatabase.automationJobs.length, 1);
    const job = mockDatabase.automationJobs[0];
    assert.strictEqual(job.ruleId, automationRule.id);
    assert.strictEqual(job.companyId, companyId);

    // Process the job
    const { AutomationWorker } = await import("../worker");
    const worker = new AutomationWorker();

    const success = await worker.processJob(job.id);
    assert.strictEqual(success, true);

    // Verify execution was recorded
    assert.strictEqual(mockDatabase.automationExecutions.length, 1);
    const execution = mockDatabase.automationExecutions[0];
    assert.strictEqual(execution.status, "COMPLETED");
    assert.strictEqual(execution.ruleId, automationRule.id);
  });

  await t.test("Failed job retry workflow", async () => {
    resetMockDatabase();

    const companyId = "company-retry";

    // Create a rule that will fail (no employee context)
    const automationRule = {
      id: "rule-fail-test",
      companyId,
      name: "Failing Rule",
      isActive: true,
      triggerType: AutomationTriggerType.EMPLOYEE_CREATED,
      triggerConfig: {},
      conditions: [],
      actions: [
        {
          type: "update_field",
          config: {
            field: "department",
            value: "nonexistent-dept",
          },
        },
      ],
      createdBy: "admin-retry",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDatabase.automationRules.push(automationRule);

    const { AutomationJobQueue } = await import("../queue");
    const queue = new AutomationJobQueue();

    // Create a job
    const jobId = await queue.enqueue(automationRule.id, companyId, {
      type: "employee_created",
      data: { employeeId: "nonexistent-emp" },
    });

    // Process job (should fail)
    const { AutomationWorker } = await import("../worker");
    const worker = new AutomationWorker();

    const success = await worker.processJob(jobId);
    assert.strictEqual(success, false);

    // Verify job is set for retry
    const failedJob = mockDatabase.automationJobs.find(
      (j: any) => j.id === jobId,
    );
    assert.strictEqual(failedJob.status, AutomationJobStatus.PENDING); // Retry
    assert.strictEqual(failedJob.attempts, 1);
    assert.ok(failedJob.nextRetryAt);
    assert.ok(failedJob.errorMessage);

    // Simulate second attempt (should still fail)
    const retrySuccess = await worker.processJob(jobId);
    assert.strictEqual(retrySuccess, false);

    const retriedJob = mockDatabase.automationJobs.find(
      (j: any) => j.id === jobId,
    );
    assert.strictEqual(retriedJob.attempts, 2);

    // After max attempts, job should be marked as failed
    await worker.processJob(jobId); // Third attempt

    const finalJob = mockDatabase.automationJobs.find(
      (j: any) => j.id === jobId,
    );
    assert.strictEqual(finalJob.status, AutomationJobStatus.FAILED);
    assert.strictEqual(finalJob.attempts, 3);
    assert.strictEqual(finalJob.nextRetryAt, null);
  });

  await t.test("Audit logging throughout workflow", async () => {
    resetMockDatabase();

    const companyId = "company-audit";
    const employeeId = "emp-audit";

    // Setup minimal data
    mockDatabase.employees.push({
      id: employeeId,
      companyId,
      isActive: true,
      userId: "user-audit",
      User: {
        id: "user-audit",
        email: "audit@example.com",
        role: "EMPLOYEE",
      },
    });

    const automationRule = {
      id: "rule-audit",
      companyId,
      name: "Audit Test Rule",
      isActive: true,
      triggerType: AutomationTriggerType.EMPLOYEE_CREATED,
      triggerConfig: {},
      conditions: [],
      actions: [
        {
          type: "send_notification",
          config: {
            channels: ["email"],
            recipientType: "employee",
            subject: "Welcome",
            message: "Welcome to the company",
          },
        },
      ],
      createdBy: "admin-audit",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockDatabase.automationRules.push(automationRule);

    // Trigger workflow
    const { AutomationScheduler } = await import(
      "../scheduler"
    );
    const scheduler = new AutomationScheduler();

    await scheduler.handleEvent("employee.created", {
      employeeId,
      userId: "user-audit",
      companyId,
    });

    // Process job
    const job = mockDatabase.automationJobs[0];
    const { AutomationWorker } = await import("../worker");
    const worker = new AutomationWorker();

    await worker.processJob(job.id);

    // Verify audit trail
    assert.ok(mockDatabase.automationExecutions.length > 0);
    const execution = mockDatabase.automationExecutions[0];

    assert.strictEqual(execution.companyId, companyId);
    assert.strictEqual(execution.ruleId, automationRule.id);
    assert.strictEqual(execution.status, "COMPLETED");
    assert.ok(execution.triggerData);
    assert.ok(execution.executionLog);
    assert.ok(execution.executionLog.workerId);
    assert.ok(execution.executionLog.jobId);
    assert.ok(execution.executionLog.actionResults);
  });

  // Reset mocks after tests
  t.after(() => {
    (Module as any)._load = originalLoad;
    resetMockDatabase();
  });
});

