import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'module'

// Mock Prisma client
const mockPrismaClient = {
  automationRule: {
    findFirst: test.mock.fn(),
    findMany: test.mock.fn(),
    count: test.mock.fn(),
  },
  automationExecution: {
    findMany: test.mock.fn(),
  },
  automationJob: {
    findMany: test.mock.fn(),
  },
  globalAuditLog: {
    create: test.mock.fn(),
  },
}

// Mock NextAuth
const mockSession = {
  user: {
    id: 'user-123',
    email: 'admin@example.com',
    companyId: 'company-123',
    role: 'ADMIN'
  }
}

// Mock automation scheduler
const mockScheduler = {
  triggerRule: test.mock.fn(),
  handleEvent: test.mock.fn(),
}

// Mock the imports
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === '@/lib/prisma') {
    return { prisma: mockPrismaClient }
  }
  if (request === 'next-auth') {
    return { getServerSession: () => Promise.resolve(mockSession) }
  }
  if (request === '@/lib/auth-options') {
    return { authOptions: {} }
  }
  if (request === '@/lib/automation') {
    return { getAutomationScheduler: () => mockScheduler }
  }
  if (request === 'zod') {
    return {
      z: {
        object: (schema: any) => ({
          parse: (data: any) => {
            // Simple validation mock
            if (data.ruleId || data.eventType) {
              return data
            }
            throw new Error('Validation failed')
          }
        }),
        string: () => ({ cuid: () => ({ optional: () => ({}) }), optional: () => ({}) }),
        record: () => ({ optional: () => ({}) }),
        any: () => ({}),
      }
    }
  }
  if (request === 'next/server') {
    return {
      NextResponse: {
        json: (data: any, options?: any) => ({
          json: () => Promise.resolve(data),
          status: options?.status || 200,
          data
        })
      }
    }
  }
  return originalLoad.call(this, request, parent, isMain)
}

test('Automation Trigger API', async (t) => {
  await t.test('POST /api/automation/trigger - manual rule trigger', async () => {
    // Import the route handler
    const { POST } = await import('../../app/api/automation/trigger/route')

    const mockRule = {
      id: 'rule-123',
      name: 'Test Rule',
      companyId: 'company-123',
      isActive: true
    }

    mockPrismaClient.automationRule.findFirst.mock.mockImplementationOnce(() => 
      Promise.resolve(mockRule)
    )

    mockScheduler.triggerRule.mock.mockImplementationOnce(() => 
      Promise.resolve(['job-1', 'job-2'])
    )

    mockPrismaClient.globalAuditLog.create.mock.mockImplementationOnce(() => 
      Promise.resolve({})
    )

    // Create mock request
    const mockRequest = {
      json: () => Promise.resolve({
        ruleId: 'rule-123',
        triggerData: { test: 'data' }
      })
    }

    const response = await POST(mockRequest as any)
    const responseData = response.data

    assert.strictEqual(responseData.success, true)
    assert.strictEqual(responseData.jobIds.length, 2)
    assert.strictEqual(responseData.ruleId, 'rule-123')
    
    // Verify scheduler was called correctly
    const triggerCall = mockScheduler.triggerRule.mock.calls[0]
    assert.strictEqual(triggerCall.arguments[0], 'rule-123')
    assert.deepStrictEqual(triggerCall.arguments[1], { test: 'data' })

    // Verify audit log was created
    const auditCall = mockPrismaClient.globalAuditLog.create.mock.calls[0]
    assert.strictEqual(auditCall.arguments[0].data.entityType, 'AUTOMATION_RULE')
    assert.strictEqual(auditCall.arguments[0].data.entityId, 'rule-123')
    assert.strictEqual(auditCall.arguments[0].data.action, 'ACTIVATED')
  })

  await t.test('POST /api/automation/trigger - event-based trigger', async () => {
    const { POST } = await import('../../app/api/automation/trigger/route')

    mockScheduler.handleEvent.mock.mockImplementationOnce(() => Promise.resolve())

    const mockRequest = {
      json: () => Promise.resolve({
        eventType: 'form.submitted',
        eventData: { formId: 'form-123', employeeId: 'emp-456' }
      })
    }

    const response = await POST(mockRequest as any)
    const responseData = response.data

    assert.strictEqual(responseData.success, true)
    assert.strictEqual(responseData.eventType, 'form.submitted')
    assert.strictEqual(responseData.companyId, 'company-123')

    // Verify scheduler handleEvent was called
    const eventCall = mockScheduler.handleEvent.mock.calls[0]
    assert.strictEqual(eventCall.arguments[0], 'form.submitted')
    assert.strictEqual(eventCall.arguments[1].formId, 'form-123')
    assert.strictEqual(eventCall.arguments[1].companyId, 'company-123')
    assert.strictEqual(eventCall.arguments[1].triggeredBy, 'user-123')
  })

  await t.test('POST /api/automation/trigger - rule not found', async () => {
    const { POST } = await import('../../app/api/automation/trigger/route')

    mockPrismaClient.automationRule.findFirst.mock.mockImplementationOnce(() => 
      Promise.resolve(null)
    )

    const mockRequest = {
      json: () => Promise.resolve({
        ruleId: 'nonexistent-rule'
      })
    }

    const response = await POST(mockRequest as any)
    
    assert.strictEqual(response.status, 404)
    assert.strictEqual(response.data.error, 'Rule not found or inactive')
  })

  await t.test('POST /api/automation/trigger - validation error', async () => {
    const { POST } = await import('../../app/api/automation/trigger/route')

    const mockRequest = {
      json: () => Promise.resolve({
        // Missing both ruleId and eventType
        triggerData: { test: 'data' }
      })
    }

    const response = await POST(mockRequest as any)
    
    assert.strictEqual(response.status, 400)
    assert.ok(response.data.error)
  })

  await t.test('GET /api/automation/trigger - specific rule status', async () => {
    const { GET } = await import('../../app/api/automation/trigger/route')

    const mockRule = {
      id: 'rule-123',
      name: 'Test Rule',
      isActive: true,
      triggerType: 'DOCUMENT_EXPIRING',
      executions: [
        {
          id: 'exec-1',
          status: 'COMPLETED',
          triggeredAt: new Date(),
          executionLog: {},
          errorMessage: null
        }
      ],
      jobs: [
        {
          id: 'job-1',
          status: 'COMPLETED',
          attempts: 1,
          scheduledAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          errorMessage: null
        }
      ]
    }

    mockPrismaClient.automationRule.findFirst.mock.mockImplementationOnce(() => 
      Promise.resolve(mockRule)
    )

    const mockRequest = {
      url: 'http://localhost:3000/api/automation/trigger?ruleId=rule-123'
    }

    const response = await GET(mockRequest as any)
    const responseData = response.data

    assert.strictEqual(responseData.rule.id, 'rule-123')
    assert.strictEqual(responseData.rule.name, 'Test Rule')
    assert.strictEqual(responseData.recentExecutions.length, 1)
    assert.strictEqual(responseData.recentJobs.length, 1)
    assert.strictEqual(responseData.summary.totalExecutions, 1)
    assert.strictEqual(responseData.summary.totalJobs, 1)
  })

  await t.test('GET /api/automation/trigger - overall activity', async () => {
    const { GET } = await import('../../app/api/automation/trigger/route')

    const mockExecutions = [
      {
        id: 'exec-1',
        triggeredAt: new Date(),
        rule: { id: 'rule-1', name: 'Rule 1', triggerType: 'DOCUMENT_EXPIRING' }
      }
    ]

    const mockJobs = [
      {
        id: 'job-1',
        createdAt: new Date(),
        rule: { id: 'rule-1', name: 'Rule 1', triggerType: 'DOCUMENT_EXPIRING' }
      }
    ]

    mockPrismaClient.automationExecution.findMany.mock.mockImplementationOnce(() => 
      Promise.resolve(mockExecutions)
    )

    mockPrismaClient.automationJob.findMany.mock.mockImplementationOnce(() => 
      Promise.resolve(mockJobs)
    )

    mockPrismaClient.automationRule.count.mock.mockImplementationOnce(() => 
      Promise.resolve(3)
    )

    const mockRequest = {
      url: 'http://localhost:3000/api/automation/trigger'
    }

    const response = await GET(mockRequest as any)
    const responseData = response.data

    assert.strictEqual(responseData.summary.activeRules, 3)
    assert.strictEqual(responseData.summary.recentExecutions, 1)
    assert.strictEqual(responseData.summary.recentJobs, 1)
    assert.strictEqual(responseData.recentActivity.executions.length, 1)
    assert.strictEqual(responseData.recentActivity.jobs.length, 1)
  })

  await t.test('GET /api/automation/trigger - rule not found', async () => {
    const { GET } = await import('../../app/api/automation/trigger/route')

    mockPrismaClient.automationRule.findFirst.mock.mockImplementationOnce(() => 
      Promise.resolve(null)
    )

    const mockRequest = {
      url: 'http://localhost:3000/api/automation/trigger?ruleId=nonexistent'
    }

    const response = await GET(mockRequest as any)
    
    assert.strictEqual(response.status, 404)
    assert.strictEqual(response.data.error, 'Rule not found')
  })

  // Reset mocks after tests
  t.after(() => {
    ;(Module as any)._load = originalLoad
  })
})
