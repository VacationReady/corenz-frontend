import test from 'node:test'
import assert from 'node:assert/strict'
import Module from 'module'
import { AutomationTriggerType } from '@prisma/client'

// Mock Prisma client
const mockPrismaClient = {
  employmentCheck: {
    findMany: test.mock.fn(),
    count: test.mock.fn(),
  },
  formSubmission: {
    findMany: test.mock.fn(),
  },
  onboardingStepInstance: {
    findMany: test.mock.fn(),
    count: test.mock.fn(),
  },
  employee: {
    findMany: test.mock.fn(),
    count: test.mock.fn(),
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

test('AutomationRuleEvaluator', async (t) => {
  const { AutomationRuleEvaluator } = await import('../../lib/automation/evaluator')

  await t.test('DOCUMENT_EXPIRING trigger evaluation', async (t) => {
    await t.test('returns matches when documents are expiring', async () => {
      const mockExpiringDocs = [
        {
          id: 'check-1',
          employeeId: 'emp-1',
          typeOfCheck: 'Passport',
          expiryDate: new Date('2024-02-01'),
          employee: {
            user: { id: 'user-1', email: 'test@example.com' }
          }
        },
        {
          id: 'check-2',
          employeeId: 'emp-2',
          typeOfCheck: 'Visa',
          expiryDate: new Date('2024-01-15'),
          employee: {
            user: { id: 'user-2', email: 'test2@example.com' }
          }
        }
      ]

      mockPrismaClient.employmentCheck.findMany.mock.mockImplementationOnce(() => 
        Promise.resolve(mockExpiringDocs)
      )

      const evaluator = new AutomationRuleEvaluator()
      const result = await evaluator.evaluateTrigger(
        AutomationTriggerType.DOCUMENT_EXPIRING,
        { daysBefore: 30 },
        'company-123'
      )

      assert.strictEqual(result.matches, true)
      assert.strictEqual(result.matchingEntities.length, 2)
      assert.strictEqual(result.matchingEntities[0].type, 'document_expiry')
      assert.strictEqual(result.matchingEntities[0].data.employmentCheckId, 'check-1')
      assert.strictEqual(result.matchingEntities[0].data.documentType, 'Passport')
      assert.strictEqual(result.metadata.daysBefore, 30)
      assert.strictEqual(result.metadata.expiringCount, 2)
    })

    await t.test('returns no matches when no documents are expiring', async () => {
      mockPrismaClient.employmentCheck.findMany.mock.mockImplementationOnce(() => 
        Promise.resolve([])
      )

      const evaluator = new AutomationRuleEvaluator()
      const result = await evaluator.evaluateTrigger(
        AutomationTriggerType.DOCUMENT_EXPIRING,
        { daysBefore: 30 },
        'company-123'
      )

      assert.strictEqual(result.matches, false)
      assert.strictEqual(result.matchingEntities.length, 0)
    })

    await t.test('filters by document types when specified', async () => {
      const evaluator = new AutomationRuleEvaluator()
      
      await evaluator.evaluateTrigger(
        AutomationTriggerType.DOCUMENT_EXPIRING,
        { daysBefore: 30, documentTypes: ['Passport', 'Visa'] },
        'company-123'
      )

      const findManyCall = mockPrismaClient.employmentCheck.findMany.mock.calls[2]
      assert.deepStrictEqual(
        findManyCall.arguments[0].where.typeOfCheck,
        { in: ['Passport', 'Visa'] }
      )
    })
  })

  await t.test('FORM_SUBMITTED trigger evaluation', async (t) => {
    await t.test('returns matches for recent form submissions', async () => {
      const mockSubmissions = [
        {
          id: 'sub-1',
          formId: 'form-123',
          employeeId: 'emp-1',
          submittedAt: new Date(),
          data: { field1: 'value1' },
          employee: {
            user: { id: 'user-1', email: 'test@example.com' }
          },
          form: { id: 'form-123', name: 'Test Form' }
        }
      ]

      mockPrismaClient.formSubmission.findMany.mock.mockImplementationOnce(() => 
        Promise.resolve(mockSubmissions)
      )

      const evaluator = new AutomationRuleEvaluator()
      const result = await evaluator.evaluateTrigger(
        AutomationTriggerType.FORM_SUBMITTED,
        { formId: 'form-123', timeWindowHours: 24 },
        'company-123'
      )

      assert.strictEqual(result.matches, true)
      assert.strictEqual(result.matchingEntities.length, 1)
      assert.strictEqual(result.matchingEntities[0].type, 'form_submission')
      assert.strictEqual(result.matchingEntities[0].data.formId, 'form-123')
      assert.strictEqual(result.matchingEntities[0].data.submissionId, 'sub-1')
      assert.deepStrictEqual(result.matchingEntities[0].data.formData, { field1: 'value1' })
    })

    await t.test('validates config requires formId', async () => {
      const evaluator = new AutomationRuleEvaluator()
      
      await assert.rejects(
        () => evaluator.evaluateTrigger(
          AutomationTriggerType.FORM_SUBMITTED,
          { timeWindowHours: 24 }, // Missing formId
          'company-123'
        ),
        /Invalid trigger configuration/
      )
    })
  })

  await t.test('EMPLOYEE_CREATED trigger evaluation', async (t) => {
    await t.test('returns matches for recently created employees', async () => {
      const mockEmployees = [
        {
          id: 'emp-1',
          userId: 'user-1',
          departmentId: 'dept-1',
          jobRoleId: 'role-1',
          user: {
            id: 'user-1',
            email: 'newbie@example.com',
            createdAt: new Date()
          },
          department: { id: 'dept-1', name: 'Engineering' },
          jobRole: { id: 'role-1', name: 'Developer' }
        }
      ]

      mockPrismaClient.employee.findMany.mock.mockImplementationOnce(() => 
        Promise.resolve(mockEmployees)
      )

      const evaluator = new AutomationRuleEvaluator()
      const result = await evaluator.evaluateTrigger(
        AutomationTriggerType.EMPLOYEE_CREATED,
        { timeWindowHours: 24 },
        'company-123'
      )

      assert.strictEqual(result.matches, true)
      assert.strictEqual(result.matchingEntities.length, 1)
      assert.strictEqual(result.matchingEntities[0].type, 'employee_created')
      assert.strictEqual(result.matchingEntities[0].data.employeeId, 'emp-1')
      assert.strictEqual(result.matchingEntities[0].data.userId, 'user-1')
      assert.strictEqual(result.matchingEntities[0].data.departmentId, 'dept-1')
    })
  })

  await t.test('condition evaluation', async (t) => {
    await t.test('returns true when no conditions are provided', async () => {
      const evaluator = new AutomationRuleEvaluator()
      const result = await evaluator.evaluateConditions([], {
        companyId: 'company-123',
        triggerData: {},
      })

      assert.strictEqual(result, true)
    })

    await t.test('evaluates role condition correctly', async () => {
      const evaluator = new AutomationRuleEvaluator()
      
      const employee = {
        user: { role: 'MANAGER' }
      }

      // Test "equals" operator
      let result = await evaluator.evaluateConditions([
        {
          type: 'role',
          config: { operator: 'equals', value: ['MANAGER'] }
        }
      ], {
        companyId: 'company-123',
        triggerData: {},
        employee
      })
      assert.strictEqual(result, true)

      // Test "not_equals" operator
      result = await evaluator.evaluateConditions([
        {
          type: 'role',
          config: { operator: 'not_equals', value: ['EMPLOYEE'] }
        }
      ], {
        companyId: 'company-123',
        triggerData: {},
        employee
      })
      assert.strictEqual(result, true)

      // Test "in" operator
      result = await evaluator.evaluateConditions([
        {
          type: 'role',
          config: { operator: 'in', value: ['ADMIN', 'MANAGER'] }
        }
      ], {
        companyId: 'company-123',
        triggerData: {},
        employee
      })
      assert.strictEqual(result, true)

      // Test failing condition
      result = await evaluator.evaluateConditions([
        {
          type: 'role',
          config: { operator: 'equals', value: ['ADMIN'] }
        }
      ], {
        companyId: 'company-123',
        triggerData: {},
        employee
      })
      assert.strictEqual(result, false)
    })

    await t.test('evaluates department condition correctly', async () => {
      const evaluator = new AutomationRuleEvaluator()
      
      const employee = {
        departmentId: 'dept-engineering',
        user: { role: 'EMPLOYEE' }
      }

      const result = await evaluator.evaluateConditions([
        {
          type: 'department',
          config: { operator: 'equals', value: ['dept-engineering'] }
        }
      ], {
        companyId: 'company-123',
        triggerData: {},
        employee
      })
      assert.strictEqual(result, true)
    })

    await t.test('evaluates date window condition correctly', async () => {
      const evaluator = new AutomationRuleEvaluator()
      
      const now = new Date()
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

      // Test current date is within window
      let result = await evaluator.evaluateConditions([
        {
          type: 'dateWindow',
          config: { startDate: yesterday.toISOString(), endDate: tomorrow.toISOString() }
        }
      ], {
        companyId: 'company-123',
        triggerData: {},
      })
      assert.strictEqual(result, true)

      // Test current date is outside window
      result = await evaluator.evaluateConditions([
        {
          type: 'dateWindow',
          config: { startDate: tomorrow.toISOString() }
        }
      ], {
        companyId: 'company-123',
        triggerData: {},
      })
      assert.strictEqual(result, false)
    })

    await t.test('requires all conditions to pass (AND logic)', async () => {
      const evaluator = new AutomationRuleEvaluator()
      
      const employee = {
        departmentId: 'dept-engineering',
        user: { role: 'MANAGER' }
      }

      // Both conditions should pass
      let result = await evaluator.evaluateConditions([
        {
          type: 'role',
          config: { operator: 'equals', value: ['MANAGER'] }
        },
        {
          type: 'department',
          config: { operator: 'equals', value: ['dept-engineering'] }
        }
      ], {
        companyId: 'company-123',
        triggerData: {},
        employee
      })
      assert.strictEqual(result, true)

      // One condition fails
      result = await evaluator.evaluateConditions([
        {
          type: 'role',
          config: { operator: 'equals', value: ['ADMIN'] }
        },
        {
          type: 'department',
          config: { operator: 'equals', value: ['dept-engineering'] }
        }
      ], {
        companyId: 'company-123',
        triggerData: {},
        employee
      })
      assert.strictEqual(result, false)
    })
  })

  await t.test('throws error for unknown trigger type', async () => {
    const evaluator = new AutomationRuleEvaluator()
    
    await assert.rejects(
      () => evaluator.evaluateTrigger(
        'UNKNOWN_TRIGGER' as AutomationTriggerType,
        {},
        'company-123'
      ),
      /No handler found for trigger type/
    )
  })

  // Reset mocks after tests
  t.after(() => {
    ;(Module as any)._load = originalLoad
  })
})
