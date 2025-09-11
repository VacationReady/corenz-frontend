import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'module'
import { AutomationJobStatus } from '@prisma/client'

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
}

// Mock the prisma import
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === '@/lib/prisma') {
    return { prisma: mockPrismaClient }
  }
  return originalLoad.call(this, request, parent, isMain)
}

test('AutomationJobQueue', async (t) => {
  const { AutomationJobQueue } = await import('../../app/lib/automation/queue')

  await t.test('enqueue creates a job with correct data', async () => {
    const mockJob = {
      id: 'job-123',
      ruleId: 'rule-456',
      companyId: 'company-789',
      triggerData: { test: 'data' },
      status: AutomationJobStatus.PENDING,
      priority: 0,
      maxAttempts: 3,
      scheduledAt: new Date(),
    }

    mockPrismaClient.automationJob.create.mock.mockImplementationOnce(() => 
      Promise.resolve(mockJob)
    )

    const queue = new AutomationJobQueue()
    const jobId = await queue.enqueue('rule-456', 'company-789', { test: 'data' })

    assert.strictEqual(jobId, 'job-123')
    assert.strictEqual(mockPrismaClient.automationJob.create.mock.callCount(), 1)
    
    const createCall = mockPrismaClient.automationJob.create.mock.calls[0]
    assert.strictEqual(createCall.arguments[0].data.ruleId, 'rule-456')
    assert.strictEqual(createCall.arguments[0].data.companyId, 'company-789')
    assert.deepStrictEqual(createCall.arguments[0].data.triggerData, { test: 'data' })
    assert.strictEqual(createCall.arguments[0].data.status, AutomationJobStatus.PENDING)
  })

  // Reset mocks after tests
  t.after(() => {
    ;(Module as any)._load = originalLoad
  })
})
