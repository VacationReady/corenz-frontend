/**
 * Integration Tests: Designer API Cross-Tenant Security
 * 
 * Tests verify that onboarding templates and journey templates
 * enforce proper tenant isolation and permission checks.
 * 
 * Run with: npm test tests/api/designer-security.test.ts
 */

import "../setupEnv";
import test, { describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/permissions";

// Aliases to preserve existing Jest-style API naming while using node:test
const it = test;
const beforeAll = before;
const afterAll = after;

// Minimal expect helper implemented on top of node:assert to avoid Jest
function expect(actual: any) {
  return {
    toBe(expected: any) {
      assert.strictEqual(actual, expected);
    },
    toBeNull() {
      assert.strictEqual(actual, null);
    },
    toBeUndefined() {
      assert.strictEqual(actual, undefined);
    },
    toBeDefined() {
      assert.notStrictEqual(actual, undefined);
    },
    toBeGreaterThan(expected: number) {
      assert.ok(actual > expected);
    },
    toBeGreaterThanOrEqual(expected: number) {
      assert.ok(actual >= expected);
    },
    toHaveLength(expected: number) {
      assert.strictEqual(actual.length, expected);
    },
    toContain(expected: any) {
      assert.ok(actual.includes(expected));
    },
    toThrow(message?: string | RegExp) {
      if (typeof message === "undefined") {
        assert.throws(actual);
      } else if (message instanceof RegExp) {
        assert.throws(actual, message);
      } else {
        // For string messages, check if error message contains the expected text
        assert.throws(actual, (error: Error) => {
          return error.message.includes(message);
        });
      }
    },
  };
}

describe("Designer API Security - Tenant Isolation", () => {
  let tenant1: any;
  let tenant2: any;
  let tenant1Template: any;
  let tenant2Template: any;
  let tenant1Journey: any;
  let tenant2Journey: any;

  beforeAll(async () => {
    // Create two test companies
    const timestamp = Date.now();
    tenant1 = await prisma.company.create({
      data: {
        id: `test-company-1-${timestamp}`,
        name: `Test Company 1-${timestamp}`,
        updatedAt: new Date(),
      },
    });

    tenant2 = await prisma.company.create({
      data: {
        id: `test-company-2-${timestamp}`,
        name: `Test Company 2-${timestamp}`,
        updatedAt: new Date(),
      },
    });

    // Create test users for each tenant
    const user1 = await prisma.user.create({
      data: {
        id: `user-t1-${Date.now()}`,
        email: `test1-${Date.now()}@test.com`,
        password: 'test',
        companyId: tenant1.id,
        updatedAt: new Date(),
      },
    });

    const user2 = await prisma.user.create({
      data: {
        id: `user-t2-${Date.now()}`,
        email: `test2-${Date.now()}@test.com`,
        password: 'test',
        companyId: tenant2.id,
        updatedAt: new Date(),
      },
    });

    // Create test templates for each tenant with explicit field selection
    tenant1Template = await prisma.onboardingTemplate.create({
      data: {
        id: `template-t1-${Date.now()}`,
        companyId: tenant1.id,
        name: 'Tenant 1 Template',
        description: 'Test template for tenant 1',
        isActive: true,
        updatedById: user1.id,
        version: 1,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        description: true,
        isActive: true,
        updatedById: true,
        updatedAt: true,
        version: true,
        publishedAt: true,
        publishedBy: true,
      },
    });

    tenant2Template = await prisma.onboardingTemplate.create({
      data: {
        id: `template-t2-${Date.now()}`,
        companyId: tenant2.id,
        name: 'Tenant 2 Template',
        description: 'Test template for tenant 2',
        isActive: true,
        updatedById: user2.id,
        version: 1,
      },
      select: {
        id: true,
        companyId: true,
        name: true,
        description: true,
        isActive: true,
        updatedById: true,
        updatedAt: true,
        version: true,
        publishedAt: true,
        publishedBy: true,
      },
    });

    // Create test journeys for each tenant
    tenant1Journey = await prisma.journeyTemplate.create({
      data: {
        id: `journey-t1-${Date.now()}`,
        companyId: tenant1.id,
        name: 'Tenant 1 Journey',
        description: 'Test journey for tenant 1',
        persona: 'New Hire',
        duration: 30,
        category: 'onboarding',
        businessGoals: ['Improve retention'],
        status: 'DRAFT',
        version: 1,
        createdBy: user1.id,
      },
    });

    tenant2Journey = await prisma.journeyTemplate.create({
      data: {
        id: `journey-t2-${Date.now()}`,
        companyId: tenant2.id,
        name: 'Tenant 2 Journey',
        description: 'Test journey for tenant 2',
        persona: 'New Hire',
        duration: 30,
        category: 'onboarding',
        businessGoals: ['Improve retention'],
        status: 'DRAFT',
        version: 1,
        createdBy: user2.id,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data - delete in proper order to respect foreign keys
    try {
      // Delete journey templates
      if (tenant1Journey?.id) {
        await prisma.journeyTemplate.delete({ where: { id: tenant1Journey.id } }).catch(() => {});
      }
      if (tenant2Journey?.id) {
        await prisma.journeyTemplate.delete({ where: { id: tenant2Journey.id } }).catch(() => {});
      }

      // Delete onboarding templates individually
      if (tenant1Template?.id) {
        await prisma.onboardingTemplate.delete({ where: { id: tenant1Template.id } }).catch(() => {});
      }
      if (tenant2Template?.id) {
        await prisma.onboardingTemplate.delete({ where: { id: tenant2Template.id } }).catch(() => {});
      }

      // Delete users - try deleteMany first, fallback to individual deletes
      try {
        if (prisma.user.deleteMany) {
          await prisma.user.deleteMany({
            where: {
              companyId: { in: [tenant1.id, tenant2.id] },
            },
          });
        }
      } catch (e) {
        // Fallback: deleteMany not available in test environment
      }

      // Delete companies
      if (tenant1?.id) {
        await prisma.company.delete({ where: { id: tenant1.id } }).catch(() => {});
      }
      if (tenant2?.id) {
        await prisma.company.delete({ where: { id: tenant2.id } }).catch(() => {});
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }

    // Disconnect if available
    if (prisma.$disconnect) {
      await prisma.$disconnect();
    }
  });

  describe('Onboarding Template Queries', () => {
    it('should only return templates for the specified tenant', async () => {
      const templates = await prisma.onboardingTemplate.findMany({
        where: { companyId: tenant1.id },
      });

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      
      // Verify all templates belong to tenant1
      templates.forEach((template) => {
        expect(template.companyId).toBe(tenant1.id);
      });

      // Verify tenant2 template is not included
      const tenant2TemplateInResults = templates.find(
        (t) => t.id === tenant2Template.id
      );
      expect(tenant2TemplateInResults).toBeUndefined();
    });

    it('should return null when fetching cross-tenant template by ID', async () => {
      const template = await prisma.onboardingTemplate.findFirst({
        where: {
          id: tenant2Template.id,
          companyId: tenant1.id,
        },
      });

      expect(template).toBeNull();
    });

    it('should prevent findUnique from exposing cross-tenant data without companyId check', async () => {
      // This demonstrates why we need explicit companyId validation
      const templateWithoutScope = await prisma.onboardingTemplate.findUnique({
        where: { id: tenant2Template.id },
      });

      // Template exists in DB
      expect(templateWithoutScope).toBeDefined();
      expect(templateWithoutScope?.companyId).toBe(tenant2.id);

      // But when we add tenant scoping, it should be inaccessible
      const templateWithScope = await prisma.onboardingTemplate.findFirst({
        where: {
          id: tenant2Template.id,
          companyId: tenant1.id,
        },
      });

      expect(templateWithScope).toBeNull();
    });
  });

  describe('Journey Template Queries', () => {
    it('should only return journeys for the specified tenant', async () => {
      const journeys = await prisma.journeyTemplate.findMany({
        where: { companyId: tenant1.id },
      });

      expect(journeys).toBeDefined();
      expect(journeys.length).toBeGreaterThan(0);
      
      // Verify all journeys belong to tenant1
      journeys.forEach((journey) => {
        expect(journey.companyId).toBe(tenant1.id);
      });

      // Verify tenant2 journey is not included
      const tenant2JourneyInResults = journeys.find(
        (j) => j.id === tenant2Journey.id
      );
      expect(tenant2JourneyInResults).toBeUndefined();
    });

    it('should return null when fetching cross-tenant journey by ID', async () => {
      const journey = await prisma.journeyTemplate.findFirst({
        where: {
          id: tenant2Journey.id,
          companyId: tenant1.id,
        },
      });

      expect(journey).toBeNull();
    });
  });

  describe('Resource Validation', () => {
    it('should validate department belongs to tenant', async () => {
      const tenant2Dept = await prisma.department.create({
        data: {
          id: `dept-t2-${Date.now()}`,
          companyId: tenant2.id,
          name: 'Tenant 2 Department',
        },
      });

      // Try to count departments from tenant1's perspective
      const count = await prisma.department.count({
        where: {
          companyId: tenant1.id,
          id: tenant2Dept.id,
        },
      });

      expect(count).toBe(0);

      // Cleanup
      await prisma.department.delete({ where: { id: tenant2Dept.id } });
    });

    it('should validate form belongs to tenant', async () => {
      const tenant2Form = await prisma.form.create({
        data: {
          id: `form-t2-${Date.now()}`,
          companyId: tenant2.id,
          name: 'Tenant 2 Form',
          slug: `tenant2-form-${Date.now()}`,
          schema: {},
          version: 1,
        },
      });

      // Try to count forms from tenant1's perspective
      const count = await prisma.form.count({
        where: {
          companyId: tenant1.id,
          id: tenant2Form.id,
        },
      });

      expect(count).toBe(0);

      // Cleanup
      await prisma.form.delete({ where: { id: tenant2Form.id } });
    });

    it('should validate document belongs to tenant', async () => {
      const tenant2Doc = await prisma.document.create({
        data: {
          id: `doc-t2-${Date.now()}`,
          companyId: tenant2.id,
          name: 'Tenant 2 Document',
          path: '/test/document.pdf',
        },
      });

      // Try to count documents from tenant1's perspective
      const count = await prisma.document.count({
        where: {
          companyId: tenant1.id,
          id: tenant2Doc.id,
        },
      });

      expect(count).toBe(0);

      // Cleanup
      await prisma.document.delete({ where: { id: tenant2Doc.id } });
    });

    it('should validate journey template belongs to tenant', async () => {
      const count = await prisma.journeyTemplate.count({
        where: {
          companyId: tenant1.id,
          id: tenant2Journey.id,
        },
      });

      expect(count).toBe(0);
    });
  });

  describe('Permission Checks', () => {
    it('should enforce onboarding read permission', async () => {
      const userWithPermission = {
        role: 'ADMIN',
        permissionProfile: null,
      };

      const userWithoutPermission = {
        role: 'EMPLOYEE',
        permissionProfile: {
          permissions: {
            onboarding: [],
          },
        },
      };

      expect(hasPermission(userWithPermission as any, 'onboarding', 'read')).toBe(true);
      expect(hasPermission(userWithoutPermission as any, 'onboarding', 'read')).toBe(false);
    });

    it('should enforce onboarding edit permission', async () => {
      const userWithEditPermission = {
        role: 'ADMIN',
        permissionProfile: null,
      };

      const userWithReadOnly = {
        role: 'EMPLOYEE',
        permissionProfile: {
          permissions: {
            onboarding: ['read'],
          },
        },
      };

      expect(hasPermission(userWithEditPermission as any, 'onboarding', 'edit')).toBe(true);
      expect(hasPermission(userWithReadOnly as any, 'onboarding', 'edit')).toBe(false);
    });
  });

  describe('Telemetry and Audit Logging', () => {
    it('should create telemetry events for cross-tenant access attempts', async () => {
      // Simulate a cross-tenant load attempt being logged
      const fingerprint = `cross-tenant-${tenant1.id}-${tenant2Template.id}`;
      const telemetryEvent = await prisma.onboardingTemplateTelemetryEvent.create({
        data: {
          id: `telemetry-${Date.now()}`,
          companyId: tenant1.id,
          eventType: 'template_load_failure',
          severity: 'error',
          message: `Cross-tenant template load attempt blocked for template ${tenant2Template.id}`,
          templateId: tenant2Template.id,
          fingerprint,
          details: {
            expectedCompanyId: tenant1.id,
            templateCompanyId: tenant2.id,
            templateName: tenant2Template.name,
          },
        },
      });

      expect(telemetryEvent).toBeDefined();
      expect(telemetryEvent.severity).toBe('error');
      expect(telemetryEvent.eventType).toBe('template_load_failure');

      // Verify we can query security events
      const securityEvents = await prisma.onboardingTemplateTelemetryEvent.findMany({
        where: {
          companyId: tenant1.id,
          eventType: 'template_load_failure',
          severity: 'error',
        },
      });

      expect(securityEvents.length).toBeGreaterThan(0);

      // Cleanup
      await prisma.onboardingTemplateTelemetryEvent.delete({
        where: { id: telemetryEvent.id },
      });
    });
  });

  describe('Serialization Security', () => {
    it('should throw error when serializing template with wrong companyId', async () => {
      const { serializeTemplate } = await import('../../app/api/onboarding/templates/tenantScopedFetch');

      expect(() => {
        // Construct a complete template object with tenant2's companyId
        const completeTemplate = {
          id: tenant2Template.id,
          companyId: tenant2Template.companyId, // This is tenant2.id
          name: tenant2Template.name,
          description: tenant2Template.description,
          isActive: tenant2Template.isActive,
          updatedAt: tenant2Template.updatedAt,
          version: tenant2Template.version || 1,
          publishedAt: tenant2Template.publishedAt || null,
          publishedBy: tenant2Template.publishedBy || null,
          User: null,
          PublishedByUser: null,
          Department: [],
          JobRole: [],
          OnboardingStep: [],
        };

        serializeTemplate(
          completeTemplate as any,
          tenant1.id // Try to serialize with tenant1.id (wrong tenant)
        );
      }).toThrow('does not belong to the current tenant');
    });

    it('should successfully serialize template with correct companyId', async () => {
      const { serializeTemplate } = await import('../../app/api/onboarding/templates/tenantScopedFetch');

      // Construct a complete template object with all required fields
      const completeTemplate = {
        id: tenant1Template.id,
        companyId: tenant1Template.companyId,
        name: tenant1Template.name,
        description: tenant1Template.description,
        isActive: tenant1Template.isActive,
        updatedAt: tenant1Template.updatedAt,
        version: tenant1Template.version || 1,
        publishedAt: tenant1Template.publishedAt || null,
        publishedBy: tenant1Template.publishedBy || null,
        User: null,
        PublishedByUser: null,
        Department: [],
        JobRole: [],
        OnboardingStep: [],
      };

      const serialized = serializeTemplate(
        completeTemplate as any,
        tenant1.id
      );

      expect(serialized).toBeDefined();
      expect(serialized.id).toBe(tenant1Template.id);
      expect(serialized.name).toBe(tenant1Template.name);
    });
  });

  describe('Update and Delete Operations', () => {
    it('should prevent updating template from wrong tenant', async () => {
      const { updateTemplate } = await import('../../app/api/onboarding/templates/actions');

      const mockSession = {
        user: {
          id: 'test-user',
          companyId: tenant1.id,
        },
      };

      await assert.rejects(
        updateTemplate(
          mockSession,
          {
            id: tenant2Template.id,
            name: 'Malicious Update',
            description: 'Should fail',
            steps: [],
          }
        ),
        /Template does not belong to tenant/
      );
    });

    it('should allow updating template from correct tenant', async () => {
      const { updateTemplate } = await import('../../app/api/onboarding/templates/actions');

      const mockSession = {
        user: {
          id: 'test-user',
          companyId: tenant1.id,
        },
      };

      const updated = await updateTemplate(
        mockSession,
        {
          id: tenant1Template.id,
          name: 'Updated Name',
          description: 'Updated description',
          steps: [],
        },
        prisma
      );

      expect(updated).toBeDefined();
      expect(updated.name).toBe('Updated Name');
    });
  });
});
