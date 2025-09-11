import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'module'

// Mock Prisma client
const mockPrismaClient = {
  employee: {
    findUnique: test.mock.fn(),
    update: test.mock.fn(),
  },
  user: {
    findMany: test.mock.fn(),
    update: test.mock.fn(),
  },
  onboardingTemplate: {
    findFirst: test.mock.fn(),
  },
  onboardingInstance: {
    findFirst: test.mock.fn(),
    create: test.mock.fn(),
  },
  onboardingStep: {
    findMany: test.mock.fn(),
  },
  onboardingStepInstance: {
    create: test.mock.fn(),
  },
}

// Mock the prisma import
const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === '@/lib/prisma') {
    return { prisma: mockPrismaClient }
  }
  return originalLoad.call(this, request, parent, isMain)
}

test('AutomationActionExecutor', async (t) => {
  const { AutomationActionExecutor } = await import('../../lib/automation/executor')

  await t.test('create_task action', async (t) => {
    await t.test('validates configuration correctly', async () => {
      const executor = new AutomationActionExecutor()

      // Valid configuration
      const validResult = await executor.executeAction('create_task', {
        title: 'Test Task',
        description: 'Test Description',
        assigneeType: 'employee',
        dueDays: 7
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(validResult.success, true)

      // Invalid configuration (missing title)
      const invalidResult = await executor.executeAction('create_task', {
        assigneeType: 'employee'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(invalidResult.success, false)
      assert.ok(invalidResult.error?.includes('Invalid action configuration'))
    })

    await t.test('resolves employee assignee correctly', async () => {
      const mockEmployee = {
        id: 'emp-123',
        userId: 'user-123',
        user: { id: 'user-123', email: 'employee@example.com' }
      }

      mockPrismaClient.employee.findUnique.mock.mockImplementationOnce(() => 
        Promise.resolve(mockEmployee)
      )

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('create_task', {
        title: 'Employee Task',
        assigneeType: 'employee'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.data?.assigneeId, 'user-123')
      assert.strictEqual(result.data?.assigneeType, 'employee')
    })

    await t.test('resolves manager assignee correctly', async () => {
      const mockEmployee = {
        id: 'emp-123',
        userId: 'user-123',
        user: { 
          id: 'user-123', 
          email: 'employee@example.com',
          managerId: 'manager-456',
          manager: { id: 'manager-456', email: 'manager@example.com' }
        }
      }

      mockPrismaClient.employee.findUnique.mock.mockImplementationOnce(() => 
        Promise.resolve(mockEmployee)
      )

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('create_task', {
        title: 'Manager Task',
        assigneeType: 'manager'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.data?.assigneeId, 'manager-456')
    })

    await t.test('resolves HR assignee correctly', async () => {
      const mockHRUsers = [
        { id: 'hr-1', email: 'hr@example.com', role: 'ADMIN' }
      ]

      mockPrismaClient.user.findMany.mock.mockImplementationOnce(() => 
        Promise.resolve(mockHRUsers)
      )

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('create_task', {
        title: 'HR Task',
        assigneeType: 'hr'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.data?.assigneeId, 'hr-1')
    })
  })

  await t.test('send_notification action', async (t) => {
    await t.test('validates configuration correctly', async () => {
      const executor = new AutomationActionExecutor()

      // Valid configuration
      const validResult = await executor.executeAction('send_notification', {
        channels: ['email'],
        recipientType: 'employee',
        subject: 'Test Subject',
        message: 'Test Message'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(validResult.success, true)

      // Invalid configuration (missing subject)
      const invalidResult = await executor.executeAction('send_notification', {
        channels: ['email'],
        recipientType: 'employee',
        message: 'Test Message'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(invalidResult.success, false)
      assert.ok(invalidResult.error?.includes('Invalid action configuration'))
    })

    await t.test('resolves employee recipient correctly', async () => {
      const mockEmployee = {
        id: 'emp-123',
        userId: 'user-123',
        user: { id: 'user-123', email: 'employee@example.com' }
      }

      mockPrismaClient.employee.findUnique.mock.mockImplementationOnce(() => 
        Promise.resolve(mockEmployee)
      )

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('send_notification', {
        channels: ['email', 'slack'],
        recipientType: 'employee',
        subject: 'Test Notification',
        message: 'Hello Employee!'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.data?.recipientCount, 1)
      assert.strictEqual(result.data?.channels.length, 2)
      assert.ok(result.data?.results.email.success)
      assert.ok(result.data?.results.slack.success)
    })

    await t.test('handles multiple channels correctly', async () => {
      const mockEmployee = {
        user: { email: 'employee@example.com' }
      }

      mockPrismaClient.employee.findUnique.mock.mockImplementationOnce(() => 
        Promise.resolve(mockEmployee)
      )

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('send_notification', {
        channels: ['email', 'slack', 'teams'],
        recipientType: 'employee',
        subject: 'Multi-channel Test',
        message: 'Testing all channels'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.data?.channels.length, 3)
      assert.ok(result.data?.results.email)
      assert.ok(result.data?.results.slack)
      assert.ok(result.data?.results.teams)
    })
  })

  await t.test('start_onboarding action', async (t) => {
    await t.test('creates onboarding instance successfully', async () => {
      const mockTemplate = {
        id: 'template-123',
        name: 'Standard Onboarding',
        isActive: true,
        companyId: 'company-123'
      }

      const mockSteps = [
        { id: 'step-1', order: 1, templateId: 'template-123' },
        { id: 'step-2', order: 2, templateId: 'template-123' }
      ]

      const mockInstance = {
        id: 'instance-123',
        employeeId: 'emp-123',
        templateId: 'template-123',
        status: 'active'
      }

      mockPrismaClient.onboardingTemplate.findFirst.mock.mockImplementationOnce(() => 
        Promise.resolve(mockTemplate)
      )
      
      mockPrismaClient.onboardingInstance.findFirst.mock.mockImplementationOnce(() => 
        Promise.resolve(null) // No existing instance
      )
      
      mockPrismaClient.onboardingInstance.create.mock.mockImplementationOnce(() => 
        Promise.resolve(mockInstance)
      )
      
      mockPrismaClient.onboardingStep.findMany.mock.mockImplementationOnce(() => 
        Promise.resolve(mockSteps)
      )
      
      mockPrismaClient.onboardingStepInstance.create
        .mock.mockImplementationOnce(() => Promise.resolve({ id: 'step-instance-1' }))
        .mock.mockImplementationOnce(() => Promise.resolve({ id: 'step-instance-2' }))

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('start_onboarding', {
        templateId: 'template-123'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.data?.instanceId, 'instance-123')
      assert.strictEqual(result.data?.templateName, 'Standard Onboarding')
      assert.strictEqual(result.data?.stepCount, 2)
    })

    await t.test('fails when template not found', async () => {
      mockPrismaClient.onboardingTemplate.findFirst.mock.mockImplementationOnce(() => 
        Promise.resolve(null)
      )

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('start_onboarding', {
        templateId: 'nonexistent-template'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, false)
      assert.ok(result.error?.includes('Onboarding template not found'))
    })

    await t.test('fails when employee already has active instance', async () => {
      const mockTemplate = {
        id: 'template-123',
        isActive: true,
        companyId: 'company-123'
      }

      const mockExistingInstance = {
        id: 'existing-instance',
        status: 'active'
      }

      mockPrismaClient.onboardingTemplate.findFirst.mock.mockImplementationOnce(() => 
        Promise.resolve(mockTemplate)
      )
      
      mockPrismaClient.onboardingInstance.findFirst.mock.mockImplementationOnce(() => 
        Promise.resolve(mockExistingInstance)
      )

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('start_onboarding', {
        templateId: 'template-123'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, false)
      assert.ok(result.error?.includes('already has an active onboarding instance'))
    })
  })

  await t.test('update_field action', async (t) => {
    await t.test('updates employee department field', async () => {
      const mockEmployee = {
        id: 'emp-123',
        userId: 'user-123',
        departmentId: 'old-dept',
        user: { id: 'user-123' }
      }

      mockPrismaClient.employee.findUnique.mock.mockImplementationOnce(() => 
        Promise.resolve(mockEmployee)
      )
      
      mockPrismaClient.employee.update.mock.mockImplementationOnce(() => 
        Promise.resolve({ ...mockEmployee, departmentId: 'new-dept' })
      )

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('update_field', {
        field: 'department',
        value: 'new-dept'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, true)
      assert.strictEqual(result.data?.field, 'department')
      assert.strictEqual(result.data?.newValue, 'new-dept')
      
      const updateCall = mockPrismaClient.employee.update.mock.calls[0]
      assert.strictEqual(updateCall.arguments[0].where.id, 'emp-123')
      assert.strictEqual(updateCall.arguments[0].data.departmentId, 'new-dept')
    })

    await t.test('updates user manager field', async () => {
      const mockEmployee = {
        id: 'emp-123',
        userId: 'user-123',
        user: { id: 'user-123', managerId: 'old-manager' }
      }

      mockPrismaClient.employee.findUnique.mock.mockImplementationOnce(() => 
        Promise.resolve(mockEmployee)
      )
      
      mockPrismaClient.user.update.mock.mockImplementationOnce(() => 
        Promise.resolve({ id: 'user-123', managerId: 'new-manager' })
      )

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('update_field', {
        field: 'manager',
        value: 'new-manager'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, true)
      
      const updateCall = mockPrismaClient.user.update.mock.calls[0]
      assert.strictEqual(updateCall.arguments[0].where.id, 'user-123')
      assert.strictEqual(updateCall.arguments[0].data.managerId, 'new-manager')
    })

    await t.test('fails for unknown field', async () => {
      const mockEmployee = {
        id: 'emp-123',
        userId: 'user-123',
        user: { id: 'user-123' }
      }

      mockPrismaClient.employee.findUnique.mock.mockImplementationOnce(() => 
        Promise.resolve(mockEmployee)
      )

      const executor = new AutomationActionExecutor()
      const result = await executor.executeAction('update_field', {
        field: 'unknownField',
        value: 'someValue'
      }, {
        companyId: 'company-123',
        triggerData: {},
        employeeId: 'emp-123',
        logger: {
          info: test.mock.fn(),
          warn: test.mock.fn(),
          error: test.mock.fn(),
          debug: test.mock.fn(),
        }
      })

      assert.strictEqual(result.success, false)
      assert.ok(result.error?.includes('Unknown field'))
    })
  })

  await t.test('executeActions processes multiple actions in sequence', async () => {
    const mockEmployee = {
      id: 'emp-123',
      userId: 'user-123',
      user: { id: 'user-123', email: 'test@example.com' }
    }

    mockPrismaClient.employee.findUnique
      .mock.mockImplementationOnce(() => Promise.resolve(mockEmployee))
      .mock.mockImplementationOnce(() => Promise.resolve(mockEmployee))

    const executor = new AutomationActionExecutor()
    const results = await executor.executeActions([
      {
        type: 'create_task',
        config: { title: 'Task 1', assigneeType: 'employee' }
      },
      {
        type: 'send_notification',
        config: {
          channels: ['email'],
          recipientType: 'employee',
          subject: 'Notification',
          message: 'Message'
        }
      }
    ], {
      companyId: 'company-123',
      triggerData: {},
      employeeId: 'emp-123',
      logger: {
        info: test.mock.fn(),
        warn: test.mock.fn(),
        error: test.mock.fn(),
        debug: test.mock.fn(),
      }
    })

    assert.strictEqual(results.length, 2)
    assert.strictEqual(results[0].success, true)
    assert.strictEqual(results[1].success, true)
  })

  await t.test('returns error for unknown action type', async () => {
    const executor = new AutomationActionExecutor()
    const result = await executor.executeAction('unknown_action', {}, {
      companyId: 'company-123',
      triggerData: {},
      logger: {
        info: test.mock.fn(),
        warn: test.mock.fn(),
        error: test.mock.fn(),
        debug: test.mock.fn(),
      }
    })

    assert.strictEqual(result.success, false)
    assert.ok(result.error?.includes('No executor found for action type'))
  })

  // Reset mocks after tests
  t.after(() => {
    ;(Module as any)._load = originalLoad
  })
})
