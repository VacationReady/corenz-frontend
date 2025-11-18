/**
 * Template Versioning Integration Tests
 * Tests optimistic locking, version conflicts, and autosave functionality
 */

import "../setupEnv";
import test, { describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "@/lib/prisma";
import { updateTemplate, TemplateConflictError } from "../../app/api/onboarding/templates/actions";

// Align with node:test while keeping familiar Jest-style naming
const it = test;

// Minimal expect helper built on top of node:assert
const expect: any = (actual: any) => ({
  toBe(expected: any) {
    assert.strictEqual(actual, expected);
  },
  toBeNull() {
    assert.strictEqual(actual, null);
  },
  not: {
    toBeNull() {
      assert.notStrictEqual(actual, null);
    },
  },
  toBeDefined() {
    assert.notStrictEqual(actual, undefined);
  },
  toBeInstanceOf(ctor: any) {
    assert.ok(actual instanceof ctor, `Expected ${actual} to be instance of ${ctor.name}`);
  },
  toBeGreaterThan(expected: number) {
    assert.ok(actual > expected, `Expected ${actual} to be greater than ${expected}`);
  },
  toBeGreaterThanOrEqual(expected: number) {
    assert.ok(actual >= expected, `Expected ${actual} to be greater than or equal to ${expected}`);
  },
});

expect.fail = (message: string) => {
  assert.fail(message);
};

describe("Template Versioning", () => {
  let testCompanyId: string;
  let testUserId: string;
  let testTemplateId: string;

  beforeEach(async () => {
    // Create test company
    testCompanyId = `test_company_${Date.now()}`;
    await prisma.company.create({
      data: {
        id: testCompanyId,
        name: `Test Company ${Date.now()}`,
        updatedAt: new Date(),
      },
    });

    // Create test user
    testUserId = `test_user_${Date.now()}`;
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test${Date.now()}@example.com`,
        password: "hashed",
        companyId: testCompanyId,
        updatedAt: new Date(),
      },
    });

    // Create test template
    testTemplateId = `test_template_${Date.now()}`;
    await prisma.onboardingTemplate.create({
      data: {
        id: testTemplateId,
        name: "Test Template",
        companyId: testCompanyId,
        updatedAt: new Date(),
        updatedById: testUserId,
        version: 1,
      },
    });
  });

  afterEach(async () => {
    // Cleanup - delete in proper order
    try {
      // Try deleteMany if available, otherwise skip
      if (prisma.templateVersion?.deleteMany) {
        await prisma.templateVersion.deleteMany({ where: { companyId: testCompanyId } }).catch(() => {});
      }
      if (prisma.onboardingTemplate?.delete) {
        await prisma.onboardingTemplate.delete({ where: { id: testTemplateId } }).catch(() => {});
      }
      if (prisma.user?.deleteMany) {
        await prisma.user.deleteMany({ where: { companyId: testCompanyId } }).catch(() => {});
      }
      if (prisma.company?.delete) {
        await prisma.company.delete({ where: { id: testCompanyId } }).catch(() => {});
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  });

  describe("Optimistic Locking", () => {
    it("should reject stale writes based on version number", async () => {
      const session = {
        user: { id: testUserId, companyId: testCompanyId },
      };

      const template = await prisma.onboardingTemplate.findUnique({
        where: { id: testTemplateId },
      });

      // Simulate another user updating the template
      await prisma.onboardingTemplate.update({
        where: { id: testTemplateId },
        data: { version: { increment: 1 }, name: "Updated by another user" },
      });

      // Attempt to update with stale version
      await assert.rejects(
        async () =>
          updateTemplate(session, {
            id: testTemplateId,
            name: "My update",
            lastKnownVersion: template?.version,
            steps: [],
          }, prisma),
        TemplateConflictError,
      );
    });

    it("should reject stale writes based on updatedAt timestamp", async () => {
      const session = {
        user: { id: testUserId, companyId: testCompanyId },
      };

      const template = await prisma.onboardingTemplate.findUnique({
        where: { id: testTemplateId },
      });

      // Simulate another user updating the template
      await new Promise((resolve) => setTimeout(resolve, 10));
      await prisma.onboardingTemplate.update({
        where: { id: testTemplateId },
        data: { name: "Updated by another user" },
      });

      // Attempt to update with stale timestamp
      await assert.rejects(
        async () =>
          updateTemplate(session, {
            id: testTemplateId,
            name: "My update",
            lastKnownUpdatedAt: template?.updatedAt.toISOString(),
            steps: [],
          }, prisma),
        TemplateConflictError,
      );
    });

    it("should allow update when version matches", async () => {
      const session = {
        user: { id: testUserId, companyId: testCompanyId },
      };

      const template = await prisma.onboardingTemplate.findUnique({
        where: { id: testTemplateId },
      });

      const result = await updateTemplate(session, {
        id: testTemplateId,
        name: "Updated name",
        lastKnownVersion: template?.version,
        steps: [],
      }, prisma);

      expect(result.name).toBe("Updated name");
      expect(result.version).toBe((template?.version || 0) + 1);
    });
  });

  describe("Version Snapshots", () => {
    it("should create version snapshot when createSnapshot is true", async () => {
      const session = {
        user: { id: testUserId, companyId: testCompanyId },
      };

      await updateTemplate(session, {
        id: testTemplateId,
        name: "Updated with snapshot",
        createSnapshot: true,
        steps: [],
      }, prisma);

      const versions = await prisma.templateVersion.findMany({
        where: { templateId: testTemplateId },
      });

      expect(versions.length).toBeGreaterThan(0);
      expect(versions[0].status).toBe("DRAFT");
      expect(versions[0].createdBy).toBe(testUserId);
    });

    it("should not create snapshot when createSnapshot is false", async () => {
      const session = {
        user: { id: testUserId, companyId: testCompanyId },
      };

      await updateTemplate(session, {
        id: testTemplateId,
        name: "Updated without snapshot",
        createSnapshot: false,
        steps: [],
      }, prisma);

      const versions = await prisma.templateVersion.findMany({
        where: { templateId: testTemplateId },
      });

      expect(versions.length).toBe(0);
    });

    it("should increment version number on each update", async () => {
      const session = {
        user: { id: testUserId, companyId: testCompanyId },
      };

      const initial = await prisma.onboardingTemplate.findUnique({
        where: { id: testTemplateId },
      });

      await updateTemplate(session, {
        id: testTemplateId,
        name: "Update 1",
        steps: [],
      }, prisma);

      const after1 = await prisma.onboardingTemplate.findUnique({
        where: { id: testTemplateId },
      });

      await updateTemplate(session, {
        id: testTemplateId,
        name: "Update 2",
        steps: [],
      }, prisma);

      const after2 = await prisma.onboardingTemplate.findUnique({
        where: { id: testTemplateId },
      });

      expect(after1?.version).toBe((initial?.version || 0) + 1);
      expect(after2?.version).toBe((initial?.version || 0) + 2);
    });
  });

  describe("Publish Tracking", () => {
    it("should set publishedAt and publishedBy when isActive is true", async () => {
      const session = {
        user: { id: testUserId, companyId: testCompanyId },
      };

      const result = await updateTemplate(session, {
        id: testTemplateId,
        name: "Published template",
        isActive: true,
        steps: [],
      }, prisma);

      expect(result.publishedAt).not.toBeNull();
      expect(result.publishedBy?.id).toBe(testUserId);
    });

    it("should preserve publishedAt when updating inactive template", async () => {
      const session = {
        user: { id: testUserId, companyId: testCompanyId },
      };

      // First publish
      await updateTemplate(session, {
        id: testTemplateId,
        name: "Published",
        isActive: true,
        steps: [],
      }, prisma);

      const published = await prisma.onboardingTemplate.findUnique({
        where: { id: testTemplateId },
      });

      // Update without publishing
      await updateTemplate(session, {
        id: testTemplateId,
        name: "Draft update",
        isActive: false,
        steps: [],
      }, prisma);

      const updated = await prisma.onboardingTemplate.findUnique({
        where: { id: testTemplateId },
      });

      expect(updated?.publishedAt?.getTime()).toBe(published?.publishedAt?.getTime());
    });
  });

  describe("Conflict Error Details", () => {
    it("should include latest template data in conflict error", async () => {
      const session = {
        user: { id: testUserId, companyId: testCompanyId },
      };

      const template = await prisma.onboardingTemplate.findUnique({
        where: { id: testTemplateId },
      });

      // Simulate concurrent update
      await prisma.onboardingTemplate.update({
        where: { id: testTemplateId },
        data: { name: "Concurrent update", version: { increment: 1 } },
      });

      try {
        await updateTemplate(session, {
          id: testTemplateId,
          name: "My update",
          lastKnownVersion: template?.version,
          steps: [],
        }, prisma);
        expect.fail("Should have thrown TemplateConflictError");
      } catch (error) {
        expect(error).toBeInstanceOf(TemplateConflictError);
        if (error instanceof TemplateConflictError) {
          expect(error.latest).toBeDefined();
          expect(error.latest.name).toBe("Concurrent update");
        }
      }
    });
  });

  describe("Tenant Isolation", () => {
    it("should reject updates to templates from other tenants", async () => {
      const otherCompanyId = `other_company_${Date.now()}`;
      await prisma.company.create({
        data: {
          id: otherCompanyId,
          name: "Other Company",
          updatedAt: new Date(),
        },
      });

      const session = {
        user: { id: testUserId, companyId: otherCompanyId },
      };

      await assert.rejects(
        async () =>
          updateTemplate(session, {
            id: testTemplateId,
            name: "Cross-tenant update",
            steps: [],
          }, prisma),
        /Template not found/,
      );

      await prisma.company.delete({ where: { id: otherCompanyId } }).catch(() => {});
    });
  });
});
