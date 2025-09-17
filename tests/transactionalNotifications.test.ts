import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";
import {
  resolveTransactionalPreference,
  buildTransactionalEmail,
  dispatchTransactionalNotifications,
  BASE_TRANSACTIONAL_SECTIONS,
} from "@/lib/transactional-notifications";
import { AuditDiff } from "@/lib/audit-helpers";

// Mock modules
const mockPrisma = {
  transactionalNotificationPreference: {
    findUnique: mock.fn(),
  },
  employee: {
    findUnique: mock.fn(),
  },
  user: {
    findUnique: mock.fn(),
    findMany: mock.fn(),
  },
};

const mockResend = {
  emails: {
    send: mock.fn(),
  },
};

// Replace real modules with mocks
mock.module("@/lib/prisma", () => ({
  default: mockPrisma,
  prisma: mockPrisma,
}));

mock.module("@/lib/resend", () => ({
  resend: mockResend,
}));

describe("Transactional Notifications", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mockPrisma.transactionalNotificationPreference.findUnique.mock.resetCalls();
    mockPrisma.employee.findUnique.mock.resetCalls();
    mockPrisma.user.findUnique.mock.resetCalls();
    mockPrisma.user.findMany.mock.resetCalls();
    mockResend.emails.send.mock.resetCalls();
  });

  describe("resolveTransactionalPreference", () => {
    it("should find exact match preference", async () => {
      const mockPreference = {
        id: "pref1",
        companyId: "company1",
        section: "personal-info",
        notifyAdmin: true,
        notifyManager: false,
        notifyEmployee: true,
      };

      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve(mockPreference)
      );

      const result = await resolveTransactionalPreference("company1", "personal-info");
      
      assert.deepStrictEqual(result, mockPreference);
      assert.strictEqual(
        mockPrisma.transactionalNotificationPreference.findUnique.mock.callCount(),
        1
      );
    });

    it("should fallback to base section for form-specific preferences", async () => {
      const mockBasePreference = {
        id: "pref2",
        companyId: "company1",
        section: "forms",
        notifyAdmin: true,
        notifyManager: true,
        notifyEmployee: false,
      };

      // First call returns null (no exact match)
      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve(null)
      );
      
      // Second call returns base preference
      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve(mockBasePreference)
      );

      const result = await resolveTransactionalPreference("company1", "forms:abc123");
      
      assert.deepStrictEqual(result, mockBasePreference);
      assert.strictEqual(
        mockPrisma.transactionalNotificationPreference.findUnique.mock.callCount(),
        2
      );
    });

    it("should return null when no preference found", async () => {
      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementation(
        () => Promise.resolve(null)
      );

      const result = await resolveTransactionalPreference("company1", "unknown-section");
      
      assert.strictEqual(result, null);
    });
  });

  describe("buildTransactionalEmail", () => {
    it("should build email with proper HTML and text formatting", () => {
      const employee = {
        id: "emp1",
        firstName: "John",
        lastName: "Doe",
        User: {
          id: "user1",
          email: "john.doe@example.com",
          name: "John Doe",
        },
      };

      const actor = {
        id: "actor1",
        email: "admin@example.com",
        name: "Admin User",
      };

      const sectionConfig = BASE_TRANSACTIONAL_SECTIONS.find(s => s.id === "personal-info")!;

      const diffs: AuditDiff[] = [
        {
          field: "phone",
          oldValue: "123-456-7890",
          newValue: "098-765-4321",
        },
        {
          field: "addressStreet",
          oldValue: "123 Old St",
          newValue: "456 New Ave",
        },
      ];

      const reasons = {
        phone: "Updated to new mobile number",
        addressStreet: "Moved to new address",
      };

      const { html, text } = buildTransactionalEmail({
        employee: employee as any,
        actor: actor as any,
        sectionConfig,
        diffs,
        reasons,
      });

      // Check HTML content
      assert(html.includes("Employee Record Updated"));
      assert(html.includes("Admin User"));
      assert(html.includes("John Doe"));
      assert(html.includes("Personal Information"));
      assert(html.includes("Phone"));
      assert(html.includes("123-456-7890"));
      assert(html.includes("098-765-4321"));
      assert(html.includes("Updated to new mobile number"));

      // Check text content
      assert(text.includes("EMPLOYEE RECORD UPDATED"));
      assert(text.includes("Admin User has updated John Doe's personal information"));
      assert(text.includes("Phone"));
      assert(text.includes("From: 123-456-7890"));
      assert(text.includes("To: 098-765-4321"));
      assert(text.includes("Reason: Updated to new mobile number"));
    });

    it("should handle create and delete synthetic fields", () => {
      const employee = {
        id: "emp1",
        firstName: "Jane",
        lastName: "Smith",
        User: null,
      };

      const actor = {
        id: "actor1",
        email: "hr@example.com",
        name: "HR Manager",
      };

      const sectionConfig = BASE_TRANSACTIONAL_SECTIONS.find(s => s.id === "emergency-contacts")!;

      const diffs: AuditDiff[] = [
        {
          field: "__create__",
          oldValue: null,
          newValue: "true",
        },
      ];

      const reasons = {
        __create__: "Added new emergency contact",
      };

      const { html, text } = buildTransactionalEmail({
        employee: employee as any,
        actor: actor as any,
        sectionConfig,
        diffs,
        reasons,
      });

      // Check for create-specific content
      assert(html.includes("New Emergency Contacts record created"));
      assert(html.includes("Added new emergency contact"));
      assert(text.includes("[CREATED] New Emergency Contacts record"));
    });

    it("should format boolean and date values correctly", () => {
      const employee = {
        id: "emp1",
        firstName: "Test",
        lastName: "User",
        User: null,
      };

      const actor = {
        id: "actor1",
        email: "admin@example.com",
        name: null, // Test email fallback
      };

      const sectionConfig = BASE_TRANSACTIONAL_SECTIONS.find(s => s.id === "bank-payroll")!;

      const diffs: AuditDiff[] = [
        {
          field: "kiwiSaverEnrolled",
          oldValue: "false",
          newValue: "true",
        },
        {
          field: "startDate",
          oldValue: "2023-01-01T00:00:00.000Z",
          newValue: "2024-06-15T00:00:00.000Z",
        },
      ];

      const reasons = {
        kiwiSaverEnrolled: "Employee enrolled in KiwiSaver",
        startDate: "Corrected start date",
      };

      const { html, text } = buildTransactionalEmail({
        employee: employee as any,
        actor: actor as any,
        sectionConfig,
        diffs,
        reasons,
      });

      // Check boolean formatting
      assert(html.includes("No")); // false -> No
      assert(html.includes("Yes")); // true -> Yes

      // Check date formatting (dates should be formatted)
      assert(!html.includes("2023-01-01T")); // ISO date should be formatted
      assert(!html.includes("2024-06-15T"));
      
      // Check actor name fallback to email
      assert(html.includes("admin@example.com"));
    });
  });

  describe("dispatchTransactionalNotifications", () => {
    it("should send notifications to admins when enabled", async () => {
      // Mock preference with admin notifications enabled
      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({
          notifyAdmin: true,
          notifyManager: false,
          notifyEmployee: false,
        })
      );

      // Mock employee data
      const mockEmployee = {
        id: "emp1",
        firstName: "John",
        lastName: "Doe",
        User: {
          id: "user1",
          email: "john@example.com",
          managerId: null,
        },
        Department: null,
      };
      mockPrisma.employee.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve(mockEmployee)
      );

      // Mock actor data
      const mockActor = {
        id: "actor1",
        email: "actor@example.com",
        name: "Actor User",
      };
      mockPrisma.user.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve(mockActor)
      );

      // Mock admin users
      const mockAdmins = [
        { id: "admin1", email: "admin1@example.com", role: "ADMIN" },
        { id: "admin2", email: "admin2@example.com", role: "ADMIN" },
      ];
      mockPrisma.user.findMany.mock.mockImplementationOnce(
        () => Promise.resolve(mockAdmins)
      );

      // Mock email send
      mockResend.emails.send.mock.mockImplementationOnce(
        () => Promise.resolve({ id: "email1" })
      );

      const diffs: AuditDiff[] = [
        {
          field: "phone",
          oldValue: "123",
          newValue: "456",
        },
      ];

      const reasons = {
        phone: "Updated phone",
      };

      await dispatchTransactionalNotifications({
        companyId: "company1",
        employeeId: "emp1",
        section: "personal-info",
        diffs,
        reasons,
        changedById: "actor1",
      });

      // Verify email was sent
      assert.strictEqual(mockResend.emails.send.mock.callCount(), 1);
      const emailCall = mockResend.emails.send.mock.calls[0];
      assert.deepStrictEqual(emailCall.arguments[0].to, ["admin1@example.com", "admin2@example.com"]);
      assert(emailCall.arguments[0].subject.includes("John Doe"));
      assert(emailCall.arguments[0].subject.includes("Personal Information"));
    });

    it("should include manager when notifyManager is enabled", async () => {
      // Mock preference with manager notifications enabled
      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({
          notifyAdmin: false,
          notifyManager: true,
          notifyEmployee: false,
        })
      );

      // Mock employee with manager
      const mockEmployee = {
        id: "emp1",
        firstName: "Jane",
        lastName: "Smith",
        User: {
          id: "user1",
          email: "jane@example.com",
          managerId: "manager1",
        },
        Department: null,
      };
      mockPrisma.employee.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve(mockEmployee)
      );

      // Mock actor
      mockPrisma.user.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({ id: "actor1", email: "actor@example.com", name: "Actor" })
      );

      // Mock manager
      mockPrisma.user.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({ id: "manager1", email: "manager@example.com" })
      );

      // Mock email send
      mockResend.emails.send.mock.mockImplementationOnce(
        () => Promise.resolve({ id: "email1" })
      );

      await dispatchTransactionalNotifications({
        companyId: "company1",
        employeeId: "emp1",
        section: "employment-details",
        diffs: [{ field: "departmentId", oldValue: "dept1", newValue: "dept2" }],
        reasons: { departmentId: "Department transfer" },
        changedById: "actor1",
      });

      // Verify manager was included
      const emailCall = mockResend.emails.send.mock.calls[0];
      assert.deepStrictEqual(emailCall.arguments[0].to, ["manager@example.com"]);
    });

    it("should exclude actor from recipient list", async () => {
      // Mock preference with all notifications enabled
      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({
          notifyAdmin: true,
          notifyManager: false,
          notifyEmployee: true,
        })
      );

      // Mock employee (who is also the actor)
      const mockEmployee = {
        id: "emp1",
        firstName: "Self",
        lastName: "Editor",
        User: {
          id: "user1",
          email: "self@example.com",
        },
      };
      mockPrisma.employee.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve(mockEmployee)
      );

      // Mock actor (same as employee)
      mockPrisma.user.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({ id: "user1", email: "self@example.com", name: "Self Editor" })
      );

      // Mock admins (including the actor as admin)
      const mockAdmins = [
        { id: "user1", email: "self@example.com", role: "ADMIN" }, // Actor is admin
        { id: "admin2", email: "admin2@example.com", role: "ADMIN" },
      ];
      mockPrisma.user.findMany.mock.mockImplementationOnce(
        () => Promise.resolve(mockAdmins)
      );

      // Mock email send
      mockResend.emails.send.mock.mockImplementationOnce(
        () => Promise.resolve({ id: "email1" })
      );

      await dispatchTransactionalNotifications({
        companyId: "company1",
        employeeId: "emp1",
        section: "personal-info",
        diffs: [{ field: "phone", oldValue: "111", newValue: "222" }],
        reasons: { phone: "New number" },
        changedById: "user1",
      });

      // Verify actor was excluded from recipients
      const emailCall = mockResend.emails.send.mock.calls[0];
      assert.deepStrictEqual(emailCall.arguments[0].to, ["admin2@example.com"]);
      assert(!emailCall.arguments[0].to.includes("self@example.com"));
    });

    it("should not send email when all toggles are false", async () => {
      // Mock preference with all notifications disabled
      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({
          notifyAdmin: false,
          notifyManager: false,
          notifyEmployee: false,
        })
      );

      await dispatchTransactionalNotifications({
        companyId: "company1",
        employeeId: "emp1",
        section: "personal-info",
        diffs: [{ field: "phone", oldValue: "111", newValue: "222" }],
        reasons: { phone: "New number" },
        changedById: "actor1",
      });

      // Verify no database queries were made for employee/users
      assert.strictEqual(mockPrisma.employee.findUnique.mock.callCount(), 0);
      assert.strictEqual(mockPrisma.user.findUnique.mock.callCount(), 0);
      assert.strictEqual(mockPrisma.user.findMany.mock.callCount(), 0);
      
      // Verify no email was sent
      assert.strictEqual(mockResend.emails.send.mock.callCount(), 0);
    });

    it("should handle form-specific sections with fallback", async () => {
      // First call returns null (no exact match for forms:abc123)
      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve(null)
      );
      
      // Second call returns base forms preference
      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({
          notifyAdmin: true,
          notifyManager: false,
          notifyEmployee: true,
        })
      );

      // Mock employee
      mockPrisma.employee.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({
          id: "emp1",
          firstName: "Form",
          lastName: "User",
          User: { id: "user1", email: "form@example.com" },
        })
      );

      // Mock actor
      mockPrisma.user.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({ id: "actor1", email: "actor@example.com", name: "Actor" })
      );

      // Mock admins
      mockPrisma.user.findMany.mock.mockImplementationOnce(
        () => Promise.resolve([{ id: "admin1", email: "admin@example.com", role: "ADMIN" }])
      );

      // Mock email send
      mockResend.emails.send.mock.mockImplementationOnce(
        () => Promise.resolve({ id: "email1" })
      );

      await dispatchTransactionalNotifications({
        companyId: "company1",
        employeeId: "emp1",
        section: "forms:abc123",
        diffs: [{ field: "response1", oldValue: null, newValue: "Yes" }],
        reasons: { response1: "Initial submission" },
        changedById: "actor1",
      });

      // Verify email was sent with form-specific section
      const emailCall = mockResend.emails.send.mock.calls[0];
      assert(emailCall.arguments[0].subject.includes("Form Submission"));
      assert.deepStrictEqual(emailCall.arguments[0].to, ["admin@example.com", "form@example.com"]);
    });

    it("should handle errors gracefully without throwing", async () => {
      // Mock preference
      mockPrisma.transactionalNotificationPreference.findUnique.mock.mockImplementationOnce(
        () => Promise.resolve({ notifyAdmin: true, notifyManager: false, notifyEmployee: false })
      );

      // Mock employee fetch to throw error
      mockPrisma.employee.findUnique.mock.mockImplementationOnce(
        () => Promise.reject(new Error("Database error"))
      );

      // This should not throw
      await assert.doesNotReject(async () => {
        await dispatchTransactionalNotifications({
          companyId: "company1",
          employeeId: "emp1",
          section: "personal-info",
          diffs: [{ field: "phone", oldValue: "111", newValue: "222" }],
          reasons: { phone: "New number" },
          changedById: "actor1",
        });
      });
    });
  });
});
