/**
 * Regression tests for GET /api/documents/list role-based visibility
 * Tests that role-based document visibility is determined by actual user role,
 * not by edit/delete permissions
 */

import { NextRequest } from "next/server";
import { GET } from "@/app/api/documents/list/route";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { hasPermission } from "@/lib/permissions";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    document: {
      findMany: jest.fn(),
    },
    employee: {
      count: jest.fn(),
    },
    documentSignatureArtifact: {
      count: jest.fn(),
    },
  },
}));
jest.mock("@/lib/permissions");
jest.mock("@/lib/supabase-admin", () => ({
  default: {
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: jest.fn(() => ({
          data: { signedUrl: "https://example.com/signed-url" },
        })),
      })),
    },
  },
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockHasPermission = hasPermission as jest.MockedFunction<
  typeof hasPermission
>;
const mockPrismaUserFindUnique = prisma.user.findUnique as jest.MockedFunction<
  typeof prisma.user.findUnique
>;
const mockPrismaDocumentFindMany = prisma.document
  .findMany as jest.MockedFunction<typeof prisma.document.findMany>;

describe("GET /api/documents/list - Role-Based Visibility", () => {
  const mockSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      companyId: "company-1",
      role: "MANAGER",
    },
    expires: "2024-12-31",
  };

  const mockManagerDocs = [
    {
      id: "doc-manager-1",
      name: "Manager Document",
      category: "Policies",
      path: "path/to/manager-doc.pdf",
      size: 1024,
      type: "application/pdf",
      createdAt: new Date("2024-01-01"),
      companyId: "company-1",
      employeeId: null,
      url: null,
      canViewAdmin: false,
      canViewManager: true,
      canViewEmployee: false,
      requiresAck: false,
      requiresSignature: false,
      signatureDueAt: null,
      User: { name: "Admin", email: "admin@example.com" },
      Department: [],
      JobRole: [],
      SignatureEmployees: [],
      SignatureDepartments: [],
      SignatureJobRoles: [],
      SignatureArtifacts: [],
    },
  ];

  const mockEmployeeDocs = [
    {
      id: "doc-employee-1",
      name: "Employee Document",
      category: "Handbooks",
      path: "path/to/employee-doc.pdf",
      size: 2048,
      type: "application/pdf",
      createdAt: new Date("2024-01-02"),
      companyId: "company-1",
      employeeId: null,
      url: null,
      canViewAdmin: false,
      canViewManager: false,
      canViewEmployee: true,
      requiresAck: false,
      requiresSignature: false,
      signatureDueAt: null,
      User: { name: "Admin", email: "admin@example.com" },
      Department: [],
      JobRole: [],
      SignatureEmployees: [],
      SignatureDepartments: [],
      SignatureJobRoles: [],
      SignatureArtifacts: [],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    console.log = jest.fn(); // Suppress console logs in tests
  });

  test("MANAGER with read-only access receives canViewManager documents", async () => {
    // Setup: Manager with NO edit/delete permissions (read-only)
    mockGetServerSession.mockResolvedValue(mockSession as any);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "user-123",
      role: "MANAGER",
      departmentId: "dept-1",
      jobRoleId: "role-1",
      PermissionProfile: null,
    } as any);

    // Manager has NO edit/delete permissions
    mockHasPermission.mockReturnValue(false);

    mockPrismaDocumentFindMany.mockResolvedValue(mockManagerDocs as any);

    const req = new NextRequest("http://localhost/api/documents/list");
    const response = await GET(req);
    const data = await response.json();

    // Verify query was made with canViewManager: true
    expect(mockPrismaDocumentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              canViewManager: true,
            }),
          ]),
        }),
      })
    );

    // Verify manager documents are returned
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("doc-manager-1");
    expect(data[0].canViewManager).toBe(true);
  });

  test("EMPLOYEE without edit/delete access receives canViewEmployee documents", async () => {
    // Setup: Employee with NO edit/delete permissions
    const employeeSession = {
      ...mockSession,
      user: { ...mockSession.user, role: "EMPLOYEE" },
    };

    mockGetServerSession.mockResolvedValue(employeeSession as any);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "user-123",
      role: "EMPLOYEE",
      departmentId: "dept-1",
      jobRoleId: "role-1",
      PermissionProfile: null,
    } as any);

    // Employee has NO edit/delete permissions
    mockHasPermission.mockReturnValue(false);

    mockPrismaDocumentFindMany.mockResolvedValue(mockEmployeeDocs as any);

    const req = new NextRequest("http://localhost/api/documents/list");
    const response = await GET(req);
    const data = await response.json();

    // Verify query was made with canViewEmployee: true
    expect(mockPrismaDocumentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              canViewEmployee: true,
            }),
          ]),
        }),
      })
    );

    // Verify employee documents are returned
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe("doc-employee-1");
    expect(data[0].canViewEmployee).toBe(true);
  });

  test("ADMIN with edit/delete permissions bypasses role-based filtering", async () => {
    // Setup: Admin with edit permissions
    const adminSession = {
      ...mockSession,
      user: { ...mockSession.user, role: "ADMIN" },
    };

    mockGetServerSession.mockResolvedValue(adminSession as any);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "user-123",
      role: "ADMIN",
      departmentId: "dept-1",
      jobRoleId: "role-1",
      PermissionProfile: { canEdit: true },
    } as any);

    // Admin has edit permissions
    mockHasPermission.mockReturnValue(true);

    const allDocs = [...mockManagerDocs, ...mockEmployeeDocs];
    mockPrismaDocumentFindMany.mockResolvedValue(allDocs as any);

    const req = new NextRequest("http://localhost/api/documents/list");
    const response = await GET(req);
    const data = await response.json();

    // Verify query was made WITHOUT role-based filtering (base filter only)
    expect(mockPrismaDocumentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: "company-1",
          employeeId: null,
        }),
      })
    );

    // Verify all documents are returned
    expect(data).toHaveLength(2);
  });

  test("department and job role scoping still applies to non-admin users", async () => {
    // Setup: Manager with read-only access and specific department
    mockGetServerSession.mockResolvedValue(mockSession as any);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "user-123",
      role: "MANAGER",
      departmentId: "dept-specific",
      jobRoleId: "role-specific",
      PermissionProfile: null,
    } as any);

    mockHasPermission.mockReturnValue(false);
    mockPrismaDocumentFindMany.mockResolvedValue(mockManagerDocs as any);

    const req = new NextRequest("http://localhost/api/documents/list");
    await GET(req);

    // Verify OR conditions include department and job role scoping
    expect(mockPrismaDocumentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              canViewManager: true,
            }),
            expect.objectContaining({
              OR: expect.arrayContaining([
                expect.objectContaining({
                  AND: expect.arrayContaining([
                    { Department: { none: {} } },
                    { JobRole: { none: {} } },
                  ]),
                }),
                { Department: { some: { id: "dept-specific" } } },
                { JobRole: { some: { id: "role-specific" } } },
              ]),
            }),
          ]),
        }),
      })
    );
  });

  test("tenant scoping is maintained across all role types", async () => {
    // Test that companyId filter is always applied
    const testCases = [
      { role: "ADMIN", hasPermission: true },
      { role: "MANAGER", hasPermission: false },
      { role: "EMPLOYEE", hasPermission: false },
    ];

    for (const testCase of testCases) {
      jest.clearAllMocks();

      const testSession = {
        ...mockSession,
        user: { ...mockSession.user, role: testCase.role },
      };

      mockGetServerSession.mockResolvedValue(testSession as any);
      mockPrismaUserFindUnique.mockResolvedValue({
        id: "user-123",
        role: testCase.role,
        departmentId: "dept-1",
        jobRoleId: "role-1",
        PermissionProfile: null,
      } as any);

      mockHasPermission.mockReturnValue(testCase.hasPermission);
      mockPrismaDocumentFindMany.mockResolvedValue([]);

      const req = new NextRequest("http://localhost/api/documents/list");
      await GET(req);

      // Verify companyId is always in the where clause
      expect(mockPrismaDocumentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: "company-1",
          }),
        })
      );
    }
  });

  test("logs role and permission information for debugging", async () => {
    const consoleSpy = jest.spyOn(console, "log");

    mockGetServerSession.mockResolvedValue(mockSession as any);
    mockPrismaUserFindUnique.mockResolvedValue({
      id: "user-123",
      role: "MANAGER",
      departmentId: "dept-1",
      jobRoleId: "role-1",
      PermissionProfile: null,
    } as any);

    mockHasPermission.mockReturnValue(false);
    mockPrismaDocumentFindMany.mockResolvedValue([]);

    const req = new NextRequest("http://localhost/api/documents/list");
    await GET(req);

    // Verify logging includes role and permission info
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Documents API]")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Role: MANAGER")
    );
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("canManageDocuments: false")
    );

    consoleSpy.mockRestore();
  });
});
