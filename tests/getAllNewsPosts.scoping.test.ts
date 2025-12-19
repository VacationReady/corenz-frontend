import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const mockNewsPostFindMany = test.mock.fn<(args: any) => Promise<any[]>>();
const mockEnsurePrismaConnected = test.mock.fn<() => Promise<void>>();

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/lib/prisma") {
    return {
      prisma: {
        newsPost: {
          findMany: mockNewsPostFindMany,
        },
      },
      ensurePrismaConnected: mockEnsurePrismaConnected,
    };
  }

  if (request === "@/lib/supabase-admin") {
    return {
      __esModule: true,
      default: {
        storage: {
          from: () => ({
            createSignedUrl: async () => ({ data: { signedUrl: "signed" }, error: null }),
          }),
        },
      },
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

test.after(() => {
  (Module as any)._load = originalLoad;
});

const modPromise = import("../app/lib/news/getAllNewsPosts");

function resetMocks() {
  mockNewsPostFindMany.mock.resetCalls();
  mockEnsurePrismaConnected.mock.resetCalls();
}

test("getAllNewsPosts throws when companyId missing", async () => {
  resetMocks();

  const { getAllNewsPosts } = await modPromise;

  await assert.rejects(
    async () => {
      await (getAllNewsPosts as any)(undefined);
    },
    (err: any) => {
      assert.ok(String(err?.message || "").includes("requires companyId"));
      return true;
    },
  );

  assert.equal(mockNewsPostFindMany.mock.calls.length, 0);
});

test("getAllNewsPosts scopes Prisma query to tenant", async () => {
  resetMocks();

  mockEnsurePrismaConnected.mock.mockImplementationOnce(() => Promise.resolve());

  mockNewsPostFindMany.mock.mockImplementationOnce(async (args: any) => {
    assert.equal(args.where.publishedAt.not, null);
    assert.ok(Array.isArray(args.where.OR));
    assert.deepEqual(args.where.OR[0], { companyId: "comp-1" });
    assert.deepEqual(args.where.OR[1], { User: { is: { companyId: "comp-1" } } });

    return [];
  });

  const { getAllNewsPosts } = await modPromise;
  const posts = await getAllNewsPosts("comp-1", "user-1");

  assert.deepEqual(posts, []);
  assert.equal(mockNewsPostFindMany.mock.calls.length, 1);
});
