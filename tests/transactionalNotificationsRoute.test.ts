import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/transactional-notifications/route";

// Mock modules
const mockGetServerSession = mock.fn();
const mockPrisma = {
  transactionalNotificationPreference: {
    findMany: mock.fn(),
    upsert: mock.fn(),
    deleteMany: mock.fn(),
  },
  form: {
    findMany: mock.fn(),
  },
  $transaction: mock.fn(),
};

mock.module("next-auth/next", () => ({
  getServerSession: mockGetServerSession,
}));

mock.module("@/lib/prisma", () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

mock.module("@/lib/auth", () => ({
  authOptions: {},
}));

describe("Transactional Notifications API Routes", () => {
  beforeEach(() => {
    // Reset all mocks
    mockGetServerSession.mock.resetCalls();
    mockPrisma.transactionalNotificationPreference.findMany.mock.resetCalls();
    mockPrisma.transactionalNotificationPreference.upsert.mock.resetCalls();
    mockPrisma.transactionalNotificationPreference.deleteMany.mock.resetCalls();
    mockPrisma.form.findMany.mock.resetCalls();
    mockPrisma.$transaction.mock.resetCalls();
  });

  describe("GET /api/transactional-notifications", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mock.mockImplementationOnce(() => Promise.resolve(null));

      const req = new NextRequest("http://localhost:3000/api/transactional-notifications");
      const response = await GET(req);
      
      assert.strictEqual(response.status, 401);
      const body = await response.json();
      assert.strictEqual(body.error, "Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockGetServerSession.mock.mockImplementationOnce(() =>
        Promise.resolve({
          user: {
            id: "user1",
            companyId: "company1",
            role: "USER", // Not admin
          },
        })
      );

      const req = new NextRequest("http://localhost:3000/api/transactional-notifications");
      const response = await GET(req);
      
      assert.strictEqual(response.status, 403);
      const body = await response.json();
      assert.strictEqual(body.error, "Forbidden");
    });

    it("should return preferences grouped by category for admin", async () => {
      mockGetServerSession.mock.mockImplementationOnce(() =>
        Promise.resolve({
          user: {
            id: "user1",
            companyId: "company1",
            role: "ADMIN",
          },
        })
      );

      // Mock stored preferences
      mockPrisma.transactionalNotificationPreference.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([
          {
            section: "personal-info",
            notifyAdmin: false,
            notifyManager: true,
            notifyEmployee: true,
            updatedAt: new Date("2024-01-01"),
          },
          {
            section: "forms",
            notifyAdmin: true,
            notifyManager: false,
            notifyEmployee: false,
            updatedAt: new Date("2024-01-02"),
          },
        ])
      );

      // Mock active forms
      mockPrisma.form.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([
          { id: "form1", name: "Exit Survey" },
          { id: "form2", name: "Feedback Form" },
        ])
      );

      const req = new NextRequest("http://localhost:3000/api/transactional-notifications");
      const response = await GET(req);
      
      assert.strictEqual(response.status, 200);
      const body = await response.json();
      
      assert(Array.isArray(body.groups));
      assert(body.groups.length > 0);
      
      // Check Core Profile group exists
      const coreProfileGroup = body.groups.find((g: any) => g.id === "Core Profile");
      assert(coreProfileGroup);
      assert(coreProfileGroup.sections.length > 0);
      
      // Check personal-info has custom settings
      const personalInfo = coreProfileGroup.sections.find((s: any) => s.section === "personal-info");
      assert(personalInfo);
      assert.strictEqual(personalInfo.notifyAdmin, false);
      assert.strictEqual(personalInfo.notifyManager, true);
      assert.strictEqual(personalInfo.notifyEmployee, true);
      assert.strictEqual(personalInfo.isDefault, false);
      
      // Check Forms group exists with dynamic forms
      const formsGroup = body.groups.find((g: any) => g.id === "Forms");
      assert(formsGroup);
      
      // Should have base forms entry plus dynamic forms
      const baseFormsSection = formsGroup.sections.find((s: any) => s.section === "forms");
      assert(baseFormsSection);
      assert.strictEqual(baseFormsSection.notifyAdmin, true);
      
      const exitSurvey = formsGroup.sections.find((s: any) => s.section === "forms:form1");
      assert(exitSurvey);
      assert.strictEqual(exitSurvey.label, "Exit Survey");
      assert.strictEqual(exitSurvey.notifyAdmin, true); // Inherits from base forms
      assert.strictEqual(exitSurvey.isDefault, true); // No specific preference
    });

    it("should use default values when no preferences are stored", async () => {
      mockGetServerSession.mock.mockImplementationOnce(() =>
        Promise.resolve({
          user: {
            id: "user1",
            companyId: "company1",
            role: "ADMIN",
          },
        })
      );

      // No stored preferences
      mockPrisma.transactionalNotificationPreference.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([])
      );

      // No forms
      mockPrisma.form.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([])
      );

      const req = new NextRequest("http://localhost:3000/api/transactional-notifications");
      const response = await GET(req);
      
      assert.strictEqual(response.status, 200);
      const body = await response.json();
      
      // Check default values (admin-only)
      const coreProfileGroup = body.groups.find((g: any) => g.id === "Core Profile");
      const personalInfo = coreProfileGroup.sections.find((s: any) => s.section === "personal-info");
      assert.strictEqual(personalInfo.notifyAdmin, true);
      assert.strictEqual(personalInfo.notifyManager, false);
      assert.strictEqual(personalInfo.notifyEmployee, false);
      assert.strictEqual(personalInfo.isDefault, true);
    });
  });

  describe("PUT /api/transactional-notifications", () => {
    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mock.mockImplementationOnce(() => Promise.resolve(null));

      const req = new NextRequest("http://localhost:3000/api/transactional-notifications", {
        method: "PUT",
        body: JSON.stringify({ sections: [] }),
      });
      
      const response = await PUT(req);
      
      assert.strictEqual(response.status, 401);
      const body = await response.json();
      assert.strictEqual(body.error, "Unauthorized");
    });

    it("should return 403 when user is not admin", async () => {
      mockGetServerSession.mock.mockImplementationOnce(() =>
        Promise.resolve({
          user: {
            id: "user1",
            companyId: "company1",
            role: "USER",
          },
        })
      );

      const req = new NextRequest("http://localhost:3000/api/transactional-notifications", {
        method: "PUT",
        body: JSON.stringify({ sections: [] }),
      });
      
      const response = await PUT(req);
      
      assert.strictEqual(response.status, 403);
      const body = await response.json();
      assert.strictEqual(body.error, "Forbidden");
    });

    it("should return 400 for invalid request body", async () => {
      mockGetServerSession.mock.mockImplementationOnce(() =>
        Promise.resolve({
          user: {
            id: "user1",
            companyId: "company1",
            role: "ADMIN",
          },
        })
      );

      const req = new NextRequest("http://localhost:3000/api/transactional-notifications", {
        method: "PUT",
        body: JSON.stringify({ 
          sections: [
            { 
              section: "personal-info",
              // Missing required fields
            }
          ] 
        }),
      });
      
      const response = await PUT(req);
      
      assert.strictEqual(response.status, 400);
      const body = await response.json();
      assert.strictEqual(body.error, "Invalid request body");
      assert(body.details); // Should have validation details
    });

    it("should upsert preferences and delete stale entries", async () => {
      mockGetServerSession.mock.mockImplementationOnce(() =>
        Promise.resolve({
          user: {
            id: "user1",
            companyId: "company1",
            role: "ADMIN",
          },
        })
      );

      // Mock existing preferences (to test deletion of stale entries)
      mockPrisma.transactionalNotificationPreference.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([
          { section: "personal-info" },
          { section: "forms:old-form" }, // This should be deleted
        ])
      );

      // Mock transaction
      mockPrisma.$transaction.mock.mockImplementationOnce(async (callback) => {
        // Create a mock transaction context
        const txContext = {
          transactionalNotificationPreference: {
            upsert: mock.fn(() => Promise.resolve({})),
            deleteMany: mock.fn(() => Promise.resolve({})),
          },
        };
        
        // Execute the callback with mock transaction
        await callback(txContext);
        
        // Verify upsert was called for each new preference
        assert.strictEqual(txContext.transactionalNotificationPreference.upsert.mock.callCount(), 2);
        
        // Verify deleteMany was called for stale entries
        assert.strictEqual(txContext.transactionalNotificationPreference.deleteMany.mock.callCount(), 1);
        const deleteCall = txContext.transactionalNotificationPreference.deleteMany.mock.calls[0];
        assert.deepStrictEqual(deleteCall.arguments[0].where.section.in, ["forms:old-form"]);
      });

      // Mock response data for return
      mockPrisma.transactionalNotificationPreference.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([])
      );
      mockPrisma.form.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([])
      );

      const req = new NextRequest("http://localhost:3000/api/transactional-notifications", {
        method: "PUT",
        body: JSON.stringify({
          sections: [
            {
              section: "personal-info",
              notifyAdmin: true,
              notifyManager: false,
              notifyEmployee: true,
            },
            {
              section: "bank-payroll",
              notifyAdmin: false,
              notifyManager: true,
              notifyEmployee: false,
            },
          ],
        }),
      });
      
      const response = await PUT(req);
      
      assert.strictEqual(response.status, 200);
      const body = await response.json();
      assert(body.groups); // Should return updated preferences
    });

    it("should handle empty sections array", async () => {
      mockGetServerSession.mock.mockImplementationOnce(() =>
        Promise.resolve({
          user: {
            id: "user1",
            companyId: "company1",
            role: "ADMIN",
          },
        })
      );

      // Mock existing preferences (all should be deleted)
      mockPrisma.transactionalNotificationPreference.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([
          { section: "personal-info" },
          { section: "bank-payroll" },
        ])
      );

      // Mock transaction
      mockPrisma.$transaction.mock.mockImplementationOnce(async (callback) => {
        const txContext = {
          transactionalNotificationPreference: {
            upsert: mock.fn(),
            deleteMany: mock.fn(() => Promise.resolve({})),
          },
        };
        
        await callback(txContext);
        
        // No upserts should be called
        assert.strictEqual(txContext.transactionalNotificationPreference.upsert.mock.callCount(), 0);
        
        // All existing should be deleted
        assert.strictEqual(txContext.transactionalNotificationPreference.deleteMany.mock.callCount(), 1);
        const deleteCall = txContext.transactionalNotificationPreference.deleteMany.mock.calls[0];
        assert.deepStrictEqual(deleteCall.arguments[0].where.section.in, ["personal-info", "bank-payroll"]);
      });

      // Mock response data
      mockPrisma.transactionalNotificationPreference.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([])
      );
      mockPrisma.form.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([])
      );

      const req = new NextRequest("http://localhost:3000/api/transactional-notifications", {
        method: "PUT",
        body: JSON.stringify({ sections: [] }),
      });
      
      const response = await PUT(req);
      
      assert.strictEqual(response.status, 200);
    });

    it("should handle database errors gracefully", async () => {
      mockGetServerSession.mock.mockImplementationOnce(() =>
        Promise.resolve({
          user: {
            id: "user1",
            companyId: "company1",
            role: "ADMIN",
          },
        })
      );

      // Mock database error
      mockPrisma.transactionalNotificationPreference.findMany.mock.mockImplementationOnce(
        () => Promise.reject(new Error("Database connection failed"))
      );

      const req = new NextRequest("http://localhost:3000/api/transactional-notifications", {
        method: "PUT",
        body: JSON.stringify({
          sections: [
            {
              section: "personal-info",
              notifyAdmin: true,
              notifyManager: false,
              notifyEmployee: false,
            },
          ],
        }),
      });
      
      const response = await PUT(req);
      
      assert.strictEqual(response.status, 500);
      const body = await response.json();
      assert.strictEqual(body.error, "Failed to update preferences");
    });
  });
});
