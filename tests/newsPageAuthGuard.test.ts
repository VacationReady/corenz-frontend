import "./setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const mockAuth = test.mock.fn<() => Promise<any>>();
const mockGetAllNewsPosts = test.mock.fn<(companyId: string, userId?: string) => Promise<any[]>>();
const mockEnsurePrismaConnected = test.mock.fn<() => Promise<void>>();
const mockUserFindUnique = test.mock.fn<(args: any) => Promise<any>>();

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next/navigation") {
    return {
      redirect: (url: string) => {
        const err: any = new Error("NEXT_REDIRECT");
        err.url = url;
        throw err;
      },
    };
  }

  if (request === "@/lib/auth-options") {
    return { auth: mockAuth, authOptions: {} };
  }

  if (request === "@/lib/news/getAllNewsPosts") {
    return { getAllNewsPosts: mockGetAllNewsPosts };
  }

  if (request === "@/lib/prisma") {
    return {
      prisma: {
        user: {
          findUnique: mockUserFindUnique,
        },
      },
      ensurePrismaConnected: mockEnsurePrismaConnected,
    };
  }

  if (request === "@/components/news/NewsPageClient") {
    return {
      __esModule: true,
      default: function NewsPageClient() {
        return null;
      },
    };
  }

  return originalLoad.call(this, request, parent, isMain);
};

test.after(() => {
  (Module as any)._load = originalLoad;
});

const pagePromise = import("../app/(withSidebar)/news/page");

function resetMocks() {
  mockAuth.mock.resetCalls();
  mockGetAllNewsPosts.mock.resetCalls();
  mockEnsurePrismaConnected.mock.resetCalls();
  mockUserFindUnique.mock.resetCalls();
}

test("/news redirects to /login when no session/companyId", async () => {
  resetMocks();
  mockAuth.mock.mockImplementationOnce(() => Promise.resolve(null));

  const mod = await pagePromise;

  try {
    await (mod as any).default();
    assert.fail("expected redirect");
  } catch (err: any) {
    assert.equal(err?.message, "NEXT_REDIRECT");
    assert.equal(err?.url, "/login");
  }

  assert.equal(mockGetAllNewsPosts.mock.calls.length, 0);
});

test("/news calls getAllNewsPosts when tenant context exists", async () => {
  resetMocks();

  mockAuth.mock.mockImplementationOnce(() =>
    Promise.resolve({
      user: { id: "user-1", email: "admin@company1.com", companyId: "comp-1" },
    }),
  );

  mockEnsurePrismaConnected.mock.mockImplementationOnce(() => Promise.resolve());

  mockGetAllNewsPosts.mock.mockImplementationOnce(() =>
    Promise.resolve([
      {
        id: "post-1",
        title: "Hello",
        slug: "hello",
        content: [],
        authorId: "user-1",
        publishedAt: new Date("2025-01-01T00:00:00.000Z"),
        pinned: false,
        tags: [],
        createdAt: new Date("2025-01-01T00:00:00.000Z"),
        coverImage: null,
        views: 0,
        reactions: {},
        bookmarkCount: 0,
        isBookmarked: false,
        userReaction: null,
        User: { name: "Admin", email: "admin@company1.com", profileImageUrl: null },
      },
    ]),
  );

  mockUserFindUnique.mock.mockImplementationOnce(() => Promise.resolve({ role: "ADMIN" }));

  const mod = await pagePromise;
  const element = await (mod as any).default();

  assert.equal(mockGetAllNewsPosts.mock.calls.length, 1);
  const args = mockGetAllNewsPosts.mock.calls[0].arguments;
  assert.equal(args[0], "comp-1");
  assert.equal(args[1], "user-1");

  assert.ok(element);
  assert.equal((element as any).props?.canPost, true);
});
