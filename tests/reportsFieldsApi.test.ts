import "./setupEnv";
import { describe, it, beforeEach, mock } from "node:test";
import assert from "node:assert";

// Check if module mocking is supported (requires Node.js v22.3.0+)
const supportsModuleMocking = typeof mock.module === 'function';

const mockGetServerSession = mock.fn();
const mockPrisma = {
  form: {
    findMany: mock.fn(),
  },
};

if (supportsModuleMocking) {
  mock.module("next-auth", () => ({ getServerSession: mockGetServerSession }));
  mock.module("@/lib/prisma", () => ({ prisma: mockPrisma }));
}

describe("fields APIs", { skip: !supportsModuleMocking }, () => {
  beforeEach(() => {
    mockGetServerSession.mock.resetCalls();
    mockPrisma.form.findMany.mock.resetCalls();
  });

  it("includes Forms category fields from tenant forms in /api/fields", async () => {
    const { GET: FieldsGET } = await import("@/app/api/fields/route");
    
    mockGetServerSession.mock.mockImplementationOnce(() =>
      Promise.resolve({ user: { id: "u1", companyId: "c1" } }),
    );
    mockPrisma.form.findMany.mock.mockImplementationOnce(() =>
      Promise.resolve([
        { id: "f1", name: "Exit Survey", slug: "exit-survey", schema: [ { id: "q1", type: "text", label: "Reason" } ] },
      ]),
    );

    const res = await FieldsGET();
    assert.strictEqual(res.status, 200);
    const json = await res.json();
    const formsBucket = Object.keys(json.fields).find((k) => k.toLowerCase().includes("form"));
    assert(formsBucket);
    const entries = json.fields[formsBucket];
    assert(entries.some((e: any) => e.value.includes("FormSubmission.data.exit-survey.reason")));
  });

  it("returns merged hrReportFields + forms in /api/reports/fields", async () => {
    const { GET: ReportsFieldsGET } = await import("@/app/api/reports/fields/route");
    
    mockGetServerSession.mock.mockImplementationOnce(() =>
      Promise.resolve({ user: { id: "u1", companyId: "c1" } }),
    );
    mockPrisma.form.findMany.mock.mockImplementationOnce(() =>
      Promise.resolve([
        { id: "f1", name: "Pulse", slug: "pulse", schema: [ { id: "s1", type: "select", label: "Mood", options: ["Good","Bad"] } ] },
      ]),
    );

    const res = await ReportsFieldsGET();
    assert.strictEqual(res.status, 200);
    const list = await res.json();
    assert(Array.isArray(list));
    const hasPulse = list.some((f: any) => f.field === "FormSubmission.data.pulse.mood");
    assert(hasPulse);
  });
});


