import "./setupEnv";

import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest } from "next/server";

const originalLoad = (Module as any)._load;

let mockToken: any = null;
let mockRateLimitImpl: ((key: string, options: any) => Promise<boolean>) | null = null;

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth/jwt") {
    return {
      getToken: async () => mockToken,
    };
  }
  if (typeof request === "string" && request.includes("app/lib/rate-limit")) {
    return {
      rateLimit: async (key: string, options: any) => {
        if (mockRateLimitImpl) {
          return mockRateLimitImpl(key, options);
        }
        return false;
      },
    };
  }
  return originalLoad(request, parent, isMain);
};

process.env.ORIGIN_ALLOWLIST = process.env.ORIGIN_ALLOWLIST || "";

let middlewareModulePromise: Promise<typeof import("../middleware")> | null = null;

async function getMiddlewareModule() {
  if (!middlewareModulePromise) {
    middlewareModulePromise = import("../middleware");
  }
  return middlewareModulePromise;
}

async function runMiddleware(req: NextRequest) {
  const mod = await getMiddlewareModule();
  return (mod as any).middleware(req);
}

function resetMocks() {
  mockToken = null;
  mockRateLimitImpl = null;
}

test("Middleware security hardening", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      resetMocks();
      await fn();
    });
  };

  await run("returns 401 when tenant header is missing on rate-limited path", async () => {
    const req = new NextRequest("http://localhost/api/email", {
      method: "POST",
    });

    const res = await runMiddleware(req);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.error, "Tenant context is required for this operation");
  });

  await run("returns 429 when rate limit is exceeded for tenant+ip key", async () => {
    mockToken = { companyId: "tenant-1" };
    mockRateLimitImpl = async () => true; // Simulate over limit

    const req = new NextRequest("http://localhost/api/email", {
      method: "POST",
    });

    const res = await runMiddleware(req);
    const data = await res.json();

    assert.equal(res.status, 429);
    assert.equal(data.error, "Too many requests");
  });

  await run("returns 503 when rate limiter throws an error", async () => {
    mockToken = { companyId: "tenant-1" };
    mockRateLimitImpl = async () => {
      throw new Error("Test limiter failure");
    };

    const req = new NextRequest("http://localhost/api/email", {
      method: "POST",
    });

    const res = await runMiddleware(req);
    const data = await res.json();

    assert.equal(res.status, 503);
    assert.equal(data.error, "Rate limiting temporarily unavailable");
  });

  await run("returns 403 for disallowed cross-origin POST when ORIGIN_ALLOWLIST is empty", async () => {
    mockToken = { companyId: "tenant-1" };

    const req = new NextRequest("http://localhost/api/email", {
      method: "POST",
      headers: {
        origin: "https://evil.example.com",
        "x-company-id": "tenant-1",
      },
    } as any);

    const res = await runMiddleware(req);
    const data = await res.json();

    assert.equal(res.status, 403);
    assert.equal(data.error, "Origin not allowed");
  });
});
