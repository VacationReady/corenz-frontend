/**
 * Integration Tests for Documents Status Batching Endpoint
 * 
 * Tests the batched document status endpoint covering:
 * - Batched acknowledgement status retrieval
 * - Batched signature status retrieval
 * - Mixed ack/sign combinations
 * - Multi-tenant isolation
 * - Error handling
 * - Authorization
 */

import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

// Mock next-auth getServerSession
const originalLoad = (Module as any)._load;
let mockSession: any = null;
let mockPrisma: any = {};
let mockCache: any = {};

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/lib/auth-options") {
    return {
      auth: async () => mockSession,
      authOptions: {},
    };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: mockPrisma,
      ensurePrismaConnected: async () => { },
    };
  }
  if (request === "@/lib/cache") {
    return {
      documentStatusCache: mockCache,
      generateDocumentStatusCacheKey: (companyId: string, documentIds: string[]) => {
        const sortedIds = [...documentIds].sort();
        return `doc-status:${companyId}:${sortedIds.join(",")}`;
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

let routeModulePromise: Promise<typeof import("../../app/api/documents/status/route")> | null = null;

async function getRouteModule() {
  if (!routeModulePromise) {
    routeModulePromise = import("../../app/api/documents/status/route");
  }
  return routeModulePromise;
}

async function callPost(req: NextRequest) {
  const { POST } = await getRouteModule();
  return POST(req);
}

function resetMocks() {
  mockSession = null;
  mockPrisma.employee = {
    findUnique: async () => null,
  };
  mockPrisma.document = {
    findMany: async () => [],
  };
  mockPrisma.documentAcknowledgement = {
    findMany: async () => [],
  };
  mockPrisma.documentSignatureArtifact = {
    findMany: async () => [],
  };
  // Reset cache mock to always return null (cache miss)
  mockCache.get = async () => null;
  mockCache.set = async () => { };
  mockCache.delete = async () => { };
  mockCache.deletePattern = async () => { };
}

test("Documents Status API - Batching & Authorization", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  // ========================================
  // Authentication Tests
  // ========================================

  await run("POST: rejects unauthenticated requests", async () => {
    mockSession = null;

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ["doc1"] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });

  await run("POST: rejects requests without companyId", async () => {
    mockSession = {
      user: { id: "user1", email: "user@example.com" },
    };

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ["doc1"] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Unauthorized");
  });

  await run("POST: rejects requests when employee record not found", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    mockPrisma.employee.findUnique = async () => null;

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ["doc1"] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 404);
    assert.equal(data.error, "Employee record not found");
  });

  // ========================================
  // Validation Tests
  // ========================================

  await run("POST: rejects non-array documentIds", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: "not-an-array" }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.error, "documentIds must be an array");
  });

  await run("POST: returns empty object for empty array", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({ id: "emp1" });

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: [] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.deepEqual(data.statuses, {});
  });

  await run("POST: enforces maximum batch size of 100", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    const documentIds = Array.from({ length: 101 }, (_, i) => `doc${i}`);

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 400);
    assert.equal(data.error, "Maximum 100 document IDs per request");
  });

  // ========================================
  // Batched Status Retrieval Tests
  // ========================================

  await run("POST: returns status for single document", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({ id: "emp1" });

    mockPrisma.document.findMany = async ({ where }: any) => {
      assert.equal(where.companyId, "company1", "Should filter by tenant");
      assert.deepEqual(where.id, { in: ["doc1"] });
      return [
        {
          id: "doc1",
          requiresAck: true,
          requiresSignature: false,
        },
      ];
    };

    mockPrisma.documentAcknowledgement.findMany = async () => [];
    mockPrisma.documentSignatureArtifact.findMany = async () => [];

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ["doc1"] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.ok(data.statuses);
    assert.ok(data.statuses.doc1);
    assert.equal(data.statuses.doc1.requiresAck, true);
    assert.equal(data.statuses.doc1.requiresSignature, false);
    assert.equal(data.statuses.doc1.acknowledged, false);
    assert.equal(data.statuses.doc1.signed, false);
  });

  await run("POST: returns status for multiple documents in one query", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({ id: "emp1" });

    mockPrisma.document.findMany = async ({ where }: any) => {
      assert.deepEqual(where.id, { in: ["doc1", "doc2", "doc3"] });
      return [
        { id: "doc1", requiresAck: true, requiresSignature: false },
        { id: "doc2", requiresAck: false, requiresSignature: true },
        { id: "doc3", requiresAck: true, requiresSignature: true },
      ];
    };

    mockPrisma.documentAcknowledgement.findMany = async ({ where }: any) => {
      assert.deepEqual(where.documentId, { in: ["doc1", "doc2", "doc3"] });
      assert.equal(where.employeeId, "emp1");
      return [{ documentId: "doc1" }]; // Only doc1 acknowledged
    };

    mockPrisma.documentSignatureArtifact.findMany = async ({ where }: any) => {
      assert.deepEqual(where.documentId, { in: ["doc1", "doc2", "doc3"] });
      assert.equal(where.employeeId, "emp1");
      return [{ documentId: "doc2" }]; // Only doc2 signed
    };

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ["doc1", "doc2", "doc3"] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200);

    // doc1: acknowledged, not signed
    assert.equal(data.statuses.doc1.acknowledged, true);
    assert.equal(data.statuses.doc1.signed, false);

    // doc2: not acknowledged, signed
    assert.equal(data.statuses.doc2.acknowledged, false);
    assert.equal(data.statuses.doc2.signed, true);

    // doc3: not acknowledged, not signed
    assert.equal(data.statuses.doc3.acknowledged, false);
    assert.equal(data.statuses.doc3.signed, false);
  });

  await run("POST: handles mixed ack/sign combinations correctly", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({ id: "emp1" });

    mockPrisma.document.findMany = async () => [
      { id: "doc1", requiresAck: true, requiresSignature: true },
      { id: "doc2", requiresAck: true, requiresSignature: true },
      { id: "doc3", requiresAck: true, requiresSignature: true },
      { id: "doc4", requiresAck: true, requiresSignature: true },
    ];

    mockPrisma.documentAcknowledgement.findMany = async () => [
      { documentId: "doc1" }, // Ack only
      { documentId: "doc3" }, // Both
    ];

    mockPrisma.documentSignatureArtifact.findMany = async () => [
      { documentId: "doc2" }, // Sign only
      { documentId: "doc3" }, // Both
    ];

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ["doc1", "doc2", "doc3", "doc4"] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200);

    // doc1: acknowledged only
    assert.equal(data.statuses.doc1.acknowledged, true);
    assert.equal(data.statuses.doc1.signed, false);

    // doc2: signed only
    assert.equal(data.statuses.doc2.acknowledged, false);
    assert.equal(data.statuses.doc2.signed, true);

    // doc3: both acknowledged and signed
    assert.equal(data.statuses.doc3.acknowledged, true);
    assert.equal(data.statuses.doc3.signed, true);

    // doc4: neither
    assert.equal(data.statuses.doc4.acknowledged, false);
    assert.equal(data.statuses.doc4.signed, false);
  });

  // ========================================
  // Multi-Tenant Isolation Tests
  // ========================================

  await run("POST: enforces multi-tenant isolation", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({ id: "emp1" });

    let capturedCompanyId: string | undefined;
    mockPrisma.document.findMany = async ({ where }: any) => {
      capturedCompanyId = where.companyId;
      // Simulate doc2 belonging to different tenant
      return [
        { id: "doc1", requiresAck: true, requiresSignature: false },
        // doc2 not returned because it's in different tenant
      ];
    };

    mockPrisma.documentAcknowledgement.findMany = async () => [];
    mockPrisma.documentSignatureArtifact.findMany = async () => [];

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ["doc1", "doc2"] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(capturedCompanyId, "company1", "Should filter by tenant");

    // doc1 should have status
    assert.ok(data.statuses.doc1);
    assert.equal(data.statuses.doc1.requiresAck, true);

    // doc2 should return default (not accessible)
    assert.ok(data.statuses.doc2);
    assert.equal(data.statuses.doc2.requiresAck, false);
    assert.equal(data.statuses.doc2.requiresSignature, false);
  });

  await run("POST: filters out deleted documents", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({ id: "emp1" });

    let capturedDeletedAtFilter: any;
    mockPrisma.document.findMany = async ({ where }: any) => {
      capturedDeletedAtFilter = where.deletedAt;
      return [
        { id: "doc1", requiresAck: true, requiresSignature: false },
        // doc2 is deleted, not returned
      ];
    };

    mockPrisma.documentAcknowledgement.findMany = async () => [];
    mockPrisma.documentSignatureArtifact.findMany = async () => [];

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ["doc1", "doc2"] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.strictEqual(capturedDeletedAtFilter, null, "Should filter out deleted docs");

    assert.ok(data.statuses.doc1);
    assert.ok(data.statuses.doc2); // Returns default status
    assert.equal(data.statuses.doc2.requiresAck, false);
  });

  // ========================================
  // Error Handling Tests
  // ========================================

  await run("POST: handles database errors gracefully", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({ id: "emp1" });

    mockPrisma.document.findMany = async () => {
      throw new Error("Database connection failed");
    };

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ["doc1"] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 500);
    assert.equal(data.error, "Internal server error");
  });

  await run("POST: handles malformed JSON gracefully", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{ invalid json",
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 500);
    assert.equal(data.error, "Internal server error");
  });

  // ========================================
  // Performance Tests
  // ========================================

  await run("POST: efficiently batches 50 documents", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({ id: "emp1" });

    let documentQueryCount = 0;
    let ackQueryCount = 0;
    let signQueryCount = 0;

    const documentIds = Array.from({ length: 50 }, (_, i) => `doc${i}`);

    mockPrisma.document.findMany = async () => {
      documentQueryCount++;
      return documentIds.map((id) => ({
        id,
        requiresAck: true,
        requiresSignature: true,
      }));
    };

    mockPrisma.documentAcknowledgement.findMany = async () => {
      ackQueryCount++;
      return documentIds.slice(0, 25).map((id) => ({ documentId: id }));
    };

    mockPrisma.documentSignatureArtifact.findMany = async () => {
      signQueryCount++;
      return documentIds.slice(25, 50).map((id) => ({ documentId: id }));
    };

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200);

    // Verify only 3 queries total (not 100+ individual queries)
    assert.equal(documentQueryCount, 1, "Should make only 1 document query");
    assert.equal(ackQueryCount, 1, "Should make only 1 acknowledgement query");
    assert.equal(signQueryCount, 1, "Should make only 1 signature query");

    // Verify all documents have status
    assert.equal(Object.keys(data.statuses).length, 50);

    // Verify correct status distribution
    assert.equal(data.statuses.doc0.acknowledged, true);
    assert.equal(data.statuses.doc0.signed, false);
    assert.equal(data.statuses.doc30.acknowledged, false);
    assert.equal(data.statuses.doc30.signed, true);
  });

  await run("POST: handles documents with no requirements", async () => {
    mockSession = {
      user: { id: "user1", companyId: "company1", email: "user@example.com" },
    };

    mockPrisma.employee.findUnique = async () => ({ id: "emp1" });

    mockPrisma.document.findMany = async () => [
      { id: "doc1", requiresAck: false, requiresSignature: false },
    ];

    mockPrisma.documentAcknowledgement.findMany = async () => [];
    mockPrisma.documentSignatureArtifact.findMany = async () => [];

    const req = new NextRequest("http://localhost/api/documents/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentIds: ["doc1"] }),
    });

    const res = await callPost(req);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.statuses.doc1.requiresAck, false);
    assert.equal(data.statuses.doc1.requiresSignature, false);
    assert.equal(data.statuses.doc1.acknowledged, false);
    assert.equal(data.statuses.doc1.signed, false);
  });
});
