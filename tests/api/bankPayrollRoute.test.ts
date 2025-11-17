import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

const mockGetServerSession = test.mock.fn<() => Promise<any>>();
const mockEmployeeFindUnique = test.mock.fn<(args: any) => Promise<any>>();
const mockCanAccessEmployee = test.mock.fn<() => Promise<boolean>>();

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth") {
    return { getServerSession: mockGetServerSession };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: {
        employee: { findUnique: mockEmployeeFindUnique },
      },
    };
  }
  if (request === "@/lib/auth-options") {
    return { authOptions: {} };
  }
  if (request === "@/lib/permissions") {
    return { canAccessEmployee: mockCanAccessEmployee };
  }
  return originalLoad.call(this, request, parent, isMain);
};

test.after(() => {
  (Module as any)._load = originalLoad;
});

const routePromise = import("../../app/api/employees/[id]/bank-payroll/route");

function resetMocks() {
  mockGetServerSession.mock.resetCalls();
  mockEmployeeFindUnique.mock.resetCalls();
  mockCanAccessEmployee.mock.resetCalls();
}

test("GET /api/employees/[id]/bank-payroll rejects non-admin/manager roles", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({
      user: { id: "employee-1", companyId: "comp-1", role: "EMPLOYEE" },
    }),
  );
  mockEmployeeFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-1", companyId: "comp-1" }),
  );

  const { GET } = await routePromise;
  const res = await GET(
    new NextRequest("http://localhost/api/employees/emp-1/bank-payroll"),
    { params: Promise.resolve({ id: "emp-1" }) },
  );

  assert.equal(res.status, 403);
  const payload = await res.json();
  assert.equal(
    payload.error,
    "Forbidden: Payroll details restricted to admins and managers",
  );
  assert.equal(mockCanAccessEmployee.mock.calls.length, 0);
});

test("GET /api/employees/[id]/bank-payroll enforces canAccessEmployee for managers", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({
      user: { id: "manager-1", companyId: "comp-1", role: "MANAGER" },
    }),
  );
  mockEmployeeFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "emp-2", companyId: "comp-1" }),
  );
  mockCanAccessEmployee.mock.mockImplementationOnce(() => Promise.resolve(false));

  const { GET } = await routePromise;
  const res = await GET(
    new NextRequest("http://localhost/api/employees/emp-2/bank-payroll"),
    { params: Promise.resolve({ id: "emp-2" }) },
  );

  assert.equal(res.status, 403);
  const payload = await res.json();
  assert.equal(payload.error, "Forbidden");
  assert.equal(mockCanAccessEmployee.mock.calls.length, 1);
});

test("GET /api/employees/[id]/bank-payroll succeeds for admins with access", async () => {
  resetMocks();
  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({
      user: { id: "admin-1", companyId: "comp-1", role: "ADMIN" },
    }),
  );
  mockEmployeeFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({
      id: "emp-3",
      companyId: "comp-1",
      bankAccountNumber: "01-2345-6789012-000",
      irdNumber: "123456789",
      taxCode: "M",
      kiwiSaverEnrolled: true,
      kiwiSaverContribution: 0.03,
      kiwiSaverEmployeeRate: 0.03,
      kiwiSaverEmployerRate: 0.03,
      hasStudentLoan: false,
      studentLoanRate: null,
      specialTaxRate: null,
      taxExemptionReason: null,
    }),
  );
  mockCanAccessEmployee.mock.mockImplementationOnce(() => Promise.resolve(true));

  const { GET } = await routePromise;
  const res = await GET(
    new NextRequest("http://localhost/api/employees/emp-3/bank-payroll"),
    { params: Promise.resolve({ id: "emp-3" }) },
  );

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.bankAccountNumber, "01-2345-6789012-000");
  assert.equal(payload.taxCode, "M");
  assert.equal(mockCanAccessEmployee.mock.calls.length, 1);
});
