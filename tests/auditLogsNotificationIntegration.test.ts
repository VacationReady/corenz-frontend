import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import { createAuditLogs, AuditDiff, CreateAuditLogsOptions } from "@/lib/audit-helpers";

// Mock the transactional notifications module
const mockDispatchNotifications = mock.fn();

mock.module("@/lib/transactional-notifications", () => ({
  dispatchTransactionalNotifications: mockDispatchNotifications,
  BASE_TRANSACTIONAL_SECTIONS: [],
  resolveTransactionalPreference: mock.fn(),
  buildTransactionalEmail: mock.fn(),
}));

// Mock Prisma
const mockPrisma = {
  employeeAuditLog: {
    createMany: mock.fn(),
  },
};

mock.module("@/lib/prisma", () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

describe("Audit Logs Notification Integration", () => {
  beforeEach(() => {
    // Reset all mocks
    mockDispatchNotifications.mock.resetCalls();
    mockPrisma.employeeAuditLog.createMany.mock.resetCalls();
  });

  describe("createAuditLogs with notifications", () => {
    it("should dispatch notifications by default after creating audit logs", async () => {
      const diffs: AuditDiff[] = [
        {
          field: "firstName",
          oldValue: "John",
          newValue: "Jonathan",
        },
        {
          field: "email",
          oldValue: "john@example.com",
          newValue: "jonathan@example.com",
        },
      ];

      const reasons = {
        firstName: "Legal name change",
        email: "Updated to match new name",
      };

      mockPrisma.employeeAuditLog.createMany.mock.mockImplementationOnce(
        () => Promise.resolve({ count: 2 })
      );

      mockDispatchNotifications.mock.mockImplementationOnce(
        () => Promise.resolve()
      );

      await createAuditLogs({
        companyId: "company1",
        employeeId: "emp1",
        section: "personal-info",
        diffs,
        reasons,
        changedById: "user1",
      });

      // Verify audit logs were created
      assert.strictEqual(mockPrisma.employeeAuditLog.createMany.mock.callCount(), 1);
      const auditCall = mockPrisma.employeeAuditLog.createMany.mock.calls[0];
      assert.strictEqual(auditCall.arguments[0].data.length, 2);
      assert.strictEqual(auditCall.arguments[0].data[0].field, "firstName");
      assert.strictEqual(auditCall.arguments[0].data[0].reason, "Legal name change");

      // Verify notifications were dispatched
      assert.strictEqual(mockDispatchNotifications.mock.callCount(), 1);
      const notificationCall = mockDispatchNotifications.mock.calls[0];
      assert.strictEqual(notificationCall.arguments[0].companyId, "company1");
      assert.strictEqual(notificationCall.arguments[0].employeeId, "emp1");
      assert.strictEqual(notificationCall.arguments[0].section, "personal-info");
      assert.deepStrictEqual(notificationCall.arguments[0].diffs, diffs);
      assert.deepStrictEqual(notificationCall.arguments[0].reasons, reasons);
      assert.strictEqual(notificationCall.arguments[0].changedById, "user1");
    });

    it("should skip notifications when skipNotifications option is true", async () => {
      const diffs: AuditDiff[] = [
        {
          field: "salary",
          oldValue: "50000",
          newValue: "55000",
        },
      ];

      const reasons = {
        salary: "Annual raise",
      };

      mockPrisma.employeeAuditLog.createMany.mock.mockImplementationOnce(
        () => Promise.resolve({ count: 1 })
      );

      const options: CreateAuditLogsOptions = {
        skipNotifications: true,
      };

      await createAuditLogs(
        {
          companyId: "company1",
          employeeId: "emp1",
          section: "employment-details",
          diffs,
          reasons,
          changedById: "user1",
        },
        options
      );

      // Verify audit logs were created
      assert.strictEqual(mockPrisma.employeeAuditLog.createMany.mock.callCount(), 1);

      // Verify notifications were NOT dispatched
      assert.strictEqual(mockDispatchNotifications.mock.callCount(), 0);
    });

    it("should handle notification dispatch errors without breaking audit logging", async () => {
      const diffs: AuditDiff[] = [
        {
          field: "department",
          oldValue: "Sales",
          newValue: "Marketing",
        },
      ];

      const reasons = {
        department: "Internal transfer",
      };

      mockPrisma.employeeAuditLog.createMany.mock.mockImplementationOnce(
        () => Promise.resolve({ count: 1 })
      );

      // Mock notification dispatch to throw an error
      mockDispatchNotifications.mock.mockImplementationOnce(
        () => Promise.reject(new Error("Email service unavailable"))
      );

      // Original console.error to restore later
      const originalConsoleError = console.error;
      let consoleErrorCalled = false;
      console.error = (...args) => {
        consoleErrorCalled = true;
      };

      try {
        // Should not throw even if notifications fail
        await assert.doesNotReject(async () => {
          await createAuditLogs({
            companyId: "company1",
            employeeId: "emp1",
            section: "employment-details",
            diffs,
            reasons,
            changedById: "user1",
          });
        });

        // Verify audit logs were still created
        assert.strictEqual(mockPrisma.employeeAuditLog.createMany.mock.callCount(), 1);

        // Verify notification dispatch was attempted
        assert.strictEqual(mockDispatchNotifications.mock.callCount(), 1);

        // Verify error was logged
        assert(consoleErrorCalled, "Console.error should have been called");
      } finally {
        // Restore original console.error
        console.error = originalConsoleError;
      }
    });

    it("should not dispatch notifications when diffs array is empty", async () => {
      const diffs: AuditDiff[] = [];
      const reasons = {};

      await createAuditLogs({
        companyId: "company1",
        employeeId: "emp1",
        section: "personal-info",
        diffs,
        reasons,
        changedById: "user1",
      });

      // Verify no audit logs were created
      assert.strictEqual(mockPrisma.employeeAuditLog.createMany.mock.callCount(), 0);

      // Verify no notifications were dispatched
      assert.strictEqual(mockDispatchNotifications.mock.callCount(), 0);
    });

    it("should enforce required reasons before creating audit logs", async () => {
      const diffs: AuditDiff[] = [
        {
          field: "phone",
          oldValue: "123-456-7890",
          newValue: "098-765-4321",
        },
        {
          field: "email",
          oldValue: "old@example.com",
          newValue: "new@example.com",
        },
      ];

      // Missing reason for email
      const reasons = {
        phone: "New mobile number",
        // email reason is missing
      };

      await assert.rejects(
        async () => {
          await createAuditLogs({
            companyId: "company1",
            employeeId: "emp1",
            section: "personal-info",
            diffs,
            reasons,
            changedById: "user1",
          });
        },
        {
          message: "Reason required for field: email",
        }
      );

      // Verify no audit logs were created
      assert.strictEqual(mockPrisma.employeeAuditLog.createMany.mock.callCount(), 0);

      // Verify no notifications were dispatched
      assert.strictEqual(mockDispatchNotifications.mock.callCount(), 0);
    });

    it("should handle synthetic fields (__create__, __delete__) properly", async () => {
      const diffs: AuditDiff[] = [
        {
          field: "__create__",
          oldValue: null,
          newValue: "true",
        },
      ];

      const reasons = {
        __create__: "New emergency contact added",
      };

      mockPrisma.employeeAuditLog.createMany.mock.mockImplementationOnce(
        () => Promise.resolve({ count: 1 })
      );

      mockDispatchNotifications.mock.mockImplementationOnce(
        () => Promise.resolve()
      );

      await createAuditLogs({
        companyId: "company1",
        employeeId: "emp1",
        section: "emergency-contacts",
        diffs,
        reasons,
        changedById: "user1",
      });

      // Verify audit log was created with synthetic field
      const auditCall = mockPrisma.employeeAuditLog.createMany.mock.calls[0];
      assert.strictEqual(auditCall.arguments[0].data[0].field, "__create__");
      assert.strictEqual(auditCall.arguments[0].data[0].reason, "New emergency contact added");

      // Verify notification includes synthetic field
      const notificationCall = mockDispatchNotifications.mock.calls[0];
      assert.strictEqual(notificationCall.arguments[0].diffs[0].field, "__create__");
    });

    it("should provide default reason for cleared fields", async () => {
      const diffs: AuditDiff[] = [
        {
          field: "middleName",
          oldValue: "James",
          newValue: null, // Field is being cleared
        },
      ];

      // No reason provided for cleared field
      const reasons = {};

      mockPrisma.employeeAuditLog.createMany.mock.mockImplementationOnce(
        () => Promise.resolve({ count: 1 })
      );

      mockDispatchNotifications.mock.mockImplementationOnce(
        () => Promise.resolve()
      );

      await createAuditLogs({
        companyId: "company1",
        employeeId: "emp1",
        section: "personal-info",
        diffs,
        reasons,
        changedById: "user1",
      });

      // Verify audit log was created with default reason
      const auditCall = mockPrisma.employeeAuditLog.createMany.mock.calls[0];
      assert.strictEqual(auditCall.arguments[0].data[0].reason, "Field cleared");
    });

    it("should pass through all parameters correctly to notifications", async () => {
      const diffs: AuditDiff[] = [
        {
          field: "bankAccountNumber",
          oldValue: "****1234",
          newValue: "****5678",
        },
        {
          field: "taxCode",
          oldValue: "M",
          newValue: "ME",
        },
      ];

      const reasons = {
        bankAccountNumber: "Changed bank",
        taxCode: "Updated for accuracy",
      };

      mockPrisma.employeeAuditLog.createMany.mock.mockImplementationOnce(
        () => Promise.resolve({ count: 2 })
      );

      mockDispatchNotifications.mock.mockImplementationOnce(
        () => Promise.resolve()
      );

      await createAuditLogs({
        companyId: "test-company",
        employeeId: "test-employee",
        section: "bank-payroll",
        diffs,
        reasons,
        changedById: "test-user",
      });

      // Verify all parameters were passed to notification dispatcher
      const notificationCall = mockDispatchNotifications.mock.calls[0];
      assert.deepStrictEqual(notificationCall.arguments[0], {
        companyId: "test-company",
        employeeId: "test-employee",
        section: "bank-payroll",
        diffs,
        reasons,
        changedById: "test-user",
      });
    });
  });
});
