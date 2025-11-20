
import "./api/setupEnv"; // Use existing setup if available, or just ignore
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";
import { NextRequest, NextResponse } from "next/server";

// Mock dependencies via Module._load interception
const originalLoad = (Module as any)._load;
let mockGetToken: any = async () => null;

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
    if (request === "next-auth/jwt") {
        return {
            getToken: mockGetToken,
        };
    }
    return originalLoad(request, parent, isMain);
};

// Import middleware AFTER setting up mocks
// We need to use dynamic import or require to ensure mocks are used
// But since we are in ESM (likely), we might need to rely on the fact that this file is executed before middleware is imported?
// Actually, in the previous example, they used dynamic import inside the test or helper.

let middlewareModule: any;

async function getMiddleware() {
    if (!middlewareModule) {
        middlewareModule = await import("../middleware");
    }
    return middlewareModule;
}

test("Middleware Logic", async (t) => {
    // Reset mocks
    process.env.NEXTAUTH_SECRET = "secret";
    process.env.RATE_LIMIT_MAX = "100";

    const run = async (name: string, fn: () => Promise<void>) => {
        await t.test(name, async () => {
            await fn();
        });
    };

    await run("allows non-rate-limited paths without tenant header", async () => {
        const { middleware } = await getMiddleware();
        const req = new NextRequest("http://localhost/api/health");
        const res = await middleware(req);
        // NextResponse.next() returns 200 usually, or we can check if it's not 401
        assert.notEqual(res.status, 401);
    });

    await run("returns 401 for rate-limited path if tenant header is missing and no token", async () => {
        const { middleware } = await getMiddleware();
        mockGetToken = async () => null;

        const req = new NextRequest("http://localhost/api/employees");
        const res = await middleware(req);

        assert.equal(res.status, 401);
        const body = await res.json();
        assert.equal(body.error, "Tenant context is required for this operation");
    });

    await run("hydrates tenant header from token if missing", async () => {
        const { middleware } = await getMiddleware();
        mockGetToken = async () => ({ companyId: "company-123" });

        const req = new NextRequest("http://localhost/api/employees");
        const res = await middleware(req);

        // Should pass through (200)
        assert.notEqual(res.status, 401);
    });

    await run("returns 401 if token exists but has no companyId", async () => {
        const { middleware } = await getMiddleware();
        mockGetToken = async () => ({ name: "User" }); // No companyId

        const req = new NextRequest("http://localhost/api/employees");
        const res = await middleware(req);

        assert.equal(res.status, 401);
    });

    await run("respects existing x-company-id header", async () => {
        const { middleware } = await getMiddleware();
        mockGetToken = async () => null;

        const req = new NextRequest("http://localhost/api/employees", {
            headers: { "x-company-id": "company-456" },
        });
        const res = await middleware(req);

        assert.notEqual(res.status, 401);
    });

    await run("rejects cross-origin requests if not in allowlist", async () => {
        const { middleware } = await getMiddleware();
        // Assuming ORIGIN_ALLOWLIST is empty by default in test env or we set it
        process.env.ORIGIN_ALLOWLIST = ""; // Empty allowlist -> fail closed

        const req = new NextRequest("http://localhost/api/employees", {
            method: "POST",
            headers: {
                "origin": "http://evil.com",
                "x-company-id": "company-123"
            },
        });

        const res = await middleware(req);
        assert.equal(res.status, 403);
    });
});
