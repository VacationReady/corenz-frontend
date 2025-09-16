import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { AutomationJobStatus } from "@prisma/client";

// Mock Prisma client
const mockPrismaClient = {
  automationJob: {
    create: test.mock.fn(),
    findFirst: test.mock.fn(),
    findUnique: test.mock.fn(),
    update: test.mock.fn(),
    count: test.mock.fn(),
    deleteMany: test.mock.fn(),
  },
  $transaction: test.mock.fn(),
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

test("AutomationJobQueue", async (t) => {
  const { AutomationJobQueue } = await import("../../lib/automation/queue");

  await t.test("enqueue creates a job with correct data", async () => {
    const mockJob = {
      id: "job-123",
      ruleId: "rule-456",
      companyId: "company-789",
      triggerData: { test: "data" },
      status: AutomationJobStatus.PENDING,
      priority: 0,
      maxAttempts: 3,
      scheduledAt: new Date(),
    };

    mockPrismaClient.automationJob.create.mock.mockImplementationOnce(() =>
      Promise.resolve(mockJob),
    );

    const queue = new AutomationJobQueue();
    const jobId = await queue.enqueue("rule-456", "company-789", {
      test: "data",
    });

    assert.strictEqual(jobId, "job-123");
    assert.strictEqual(
      mockPrismaClient.automationJob.create.mock.callCount(),
      1,
    );

    const createCall = mockPrismaClient.automationJob.create.mock.calls[0];
    assert.strictEqual(createCall.arguments[0].data.ruleId, "rule-456");
    assert.strictEqual(createCall.arguments[0].data.companyId, "company-789");
    assert.deepStrictEqual(createCall.arguments[0].data.triggerData, {
      test: "data",
    });
    assert.strictEqual(
      createCall.arguments[0].data.status,
      AutomationJobStatus.PENDING,
    );
  });

  await t.test("enqueue accepts custom options", async () => {
    const mockJob = {
      id: "job-124",
      ruleId: "rule-456",
      companyId: "company-789",
      triggerData: { test: "data" },
      status: AutomationJobStatus.PENDING,
      priority: 5,
      maxAttempts: 5,
      scheduledAt: new Date("2024-01-01T00:00:00Z"),
    };

    mockPrismaClient.automationJob.create.mock.mockImplementationOnce(() =>
      Promise.resolve(mockJob),
    );

    const queue = new AutomationJobQueue();
    const scheduledAt = new Date("2024-01-01T00:00:00Z");

    await queue.enqueue(
      "rule-456",
      "company-789",
      { test: "data" },
      {
        priority: 5,
        maxAttempts: 5,
        scheduledAt,
      },
    );

    const createCall = mockPrismaClient.automationJob.create.mock.calls[1];
    assert.strictEqual(createCall.arguments[0].data.priority, 5);
    assert.strictEqual(createCall.arguments[0].data.maxAttempts, 5);
    assert.deepStrictEqual(
      createCall.arguments[0].data.scheduledAt,
      scheduledAt,
    );
  });

  await t.test("dequeue claims and returns next available job", async () => {
    const mockJob = {
      id: "job-125",
      ruleId: "rule-456",
      companyId: "company-789",
      triggerData: { test: "data" },
      status: AutomationJobStatus.PENDING,
      priority: 0,
      attempts: 0,
      maxAttempts: 3,
      scheduledAt: new Date(),
    };

    const claimedJob = {
      ...mockJob,
      status: AutomationJobStatus.RUNNING,
      startedAt: new Date(),
      attempts: 1,
    };

    // Mock transaction that finds and claims a job
    mockPrismaClient.$transaction.mock.mockImplementationOnce((fn) => {
      return fn({
        automationJob: {
          findFirst: () => Promise.resolve(mockJob),
          update: () => Promise.resolve(claimedJob),
          fields: { maxAttempts: "maxAttempts" }, // Mock field reference
        },
      });
    });

    const queue = new AutomationJobQueue();
    const job = await queue.dequeue("worker-123");

    assert.strictEqual(job?.id, "job-125");
    assert.strictEqual(job?.status, AutomationJobStatus.RUNNING);
    assert.strictEqual(job?.attempts, 1);
    assert.strictEqual(mockPrismaClient.$transaction.mock.callCount(), 1);
  });

  await t.test("dequeue returns null when no jobs available", async () => {
    // Mock transaction that finds no jobs
    mockPrismaClient.$transaction.mock.mockImplementationOnce((fn) => {
      return fn({
        automationJob: {
          findFirst: () => Promise.resolve(null),
          fields: { maxAttempts: "maxAttempts" },
        },
      });
    });

    const queue = new AutomationJobQueue();
    const job = await queue.dequeue("worker-123");

    assert.strictEqual(job, null);
  });

  await t.test("complete marks job as completed", async () => {
    const completedJob = {
      id: "job-126",
      status: AutomationJobStatus.COMPLETED,
      completedAt: new Date(),
    };

    mockPrismaClient.automationJob.update.mock.mockImplementationOnce(() =>
      Promise.resolve(completedJob),
    );

    const queue = new AutomationJobQueue();
    await queue.complete("job-126", { result: "success" }, "worker-123");

    const updateCall = mockPrismaClient.automationJob.update.mock.calls[0];
    assert.strictEqual(updateCall.arguments[0].where.id, "job-126");
    assert.strictEqual(
      updateCall.arguments[0].data.status,
      AutomationJobStatus.COMPLETED,
    );
    assert.ok(updateCall.arguments[0].data.completedAt);
  });

  await t.test("fail schedules retry for job under max attempts", async () => {
    const mockJob = {
      id: "job-127",
      attempts: 1,
      maxAttempts: 3,
    };

    mockPrismaClient.automationJob.findUnique.mock.mockImplementationOnce(() =>
      Promise.resolve(mockJob),
    );

    mockPrismaClient.automationJob.update.mock.mockImplementationOnce(() =>
      Promise.resolve({ ...mockJob, status: AutomationJobStatus.PENDING }),
    );

    const queue = new AutomationJobQueue();
    await queue.fail(
      "job-127",
      "Test error",
      { error: "details" },
      "worker-123",
    );

    const updateCall = mockPrismaClient.automationJob.update.mock.calls[1];
    assert.strictEqual(
      updateCall.arguments[0].data.status,
      AutomationJobStatus.PENDING,
    );
    assert.strictEqual(updateCall.arguments[0].data.errorMessage, "Test error");
    assert.ok(updateCall.arguments[0].data.nextRetryAt);
  });

  await t.test(
    "fail marks job as failed when max attempts reached",
    async () => {
      const mockJob = {
        id: "job-128",
        attempts: 3,
        maxAttempts: 3,
      };

      mockPrismaClient.automationJob.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve(mockJob),
      );

      mockPrismaClient.automationJob.update.mock.mockImplementationOnce(() =>
        Promise.resolve({ ...mockJob, status: AutomationJobStatus.FAILED }),
      );

      const queue = new AutomationJobQueue();
      await queue.fail("job-128", "Max attempts reached", {}, "worker-123");

      const updateCall = mockPrismaClient.automationJob.update.mock.calls[2];
      assert.strictEqual(
        updateCall.arguments[0].data.status,
        AutomationJobStatus.FAILED,
      );
      assert.strictEqual(updateCall.arguments[0].data.nextRetryAt, null);
    },
  );

  await t.test("getQueueStats returns correct statistics", async () => {
    // Mock count calls for different statuses
    mockPrismaClient.automationJob.count.mock
      .mockImplementationOnce(() => Promise.resolve(5)) // pending
      .mock.mockImplementationOnce(() => Promise.resolve(2)) // running
      .mock.mockImplementationOnce(() => Promise.resolve(10)) // completed
      .mock.mockImplementationOnce(() => Promise.resolve(1)) // failed
      .mock.mockImplementationOnce(() => Promise.resolve(0)) // cancelled
      .mock.mockImplementationOnce(() => Promise.resolve(18)); // total

    const queue = new AutomationJobQueue();
    const stats = await queue.getQueueStats("company-123");

    assert.strictEqual(stats.pending, 5);
    assert.strictEqual(stats.running, 2);
    assert.strictEqual(stats.completed, 10);
    assert.strictEqual(stats.failed, 1);
    assert.strictEqual(stats.cancelled, 0);
    assert.strictEqual(stats.total, 18);
  });

  await t.test("cleanup removes old jobs", async () => {
    mockPrismaClient.automationJob.deleteMany.mock.mockImplementationOnce(() =>
      Promise.resolve({ count: 15 }),
    );

    const queue = new AutomationJobQueue();
    const deletedCount = await queue.cleanup(30);

    assert.strictEqual(deletedCount, 15);

    const deleteCall = mockPrismaClient.automationJob.deleteMany.mock.calls[0];
    assert.ok(
      deleteCall.arguments[0].where.status.in.includes(
        AutomationJobStatus.COMPLETED,
      ),
    );
    assert.ok(
      deleteCall.arguments[0].where.status.in.includes(
        AutomationJobStatus.FAILED,
      ),
    );
    assert.ok(deleteCall.arguments[0].where.completedAt.lt);
  });

  await t.test("cancel marks job as cancelled", async () => {
    mockPrismaClient.automationJob.update.mock.mockImplementationOnce(() =>
      Promise.resolve({
        id: "job-129",
        status: AutomationJobStatus.CANCELLED,
        errorMessage: "Job cancelled manually",
        completedAt: new Date(),
      }),
    );

    const queue = new AutomationJobQueue();
    await queue.cancel("job-129", "Job cancelled manually");

    const updateCall = mockPrismaClient.automationJob.update.mock.calls[3];
    assert.strictEqual(updateCall.arguments[0].where.id, "job-129");
    assert.strictEqual(
      updateCall.arguments[0].data.status,
      AutomationJobStatus.CANCELLED,
    );
    assert.strictEqual(
      updateCall.arguments[0].data.errorMessage,
      "Job cancelled manually",
    );
  });

  // Reset mocks after tests
  t.after(() => {
    (Module as any)._load = originalLoad;
  });
});

