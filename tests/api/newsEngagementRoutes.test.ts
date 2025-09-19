import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const mockGetServerSession = test.mock.fn();
const mockFindFirst = test.mock.fn();
const mockUpdate = test.mock.fn();
const mockReactionUpsert = test.mock.fn();
const mockReactionGroupBy = test.mock.fn();
const mockReactionDeleteMany = test.mock.fn();
const mockBookmarkFindUnique = test.mock.fn();
const mockBookmarkCreate = test.mock.fn();
const mockBookmarkDelete = test.mock.fn();
const mockBookmarkCount = test.mock.fn();

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "next-auth") {
    return { getServerSession: mockGetServerSession };
  }
  if (request === "@/lib/prisma") {
    return {
      prisma: {
        newsPost: {
          findFirst: mockFindFirst,
          update: mockUpdate,
        },
        newsReaction: {
          upsert: mockReactionUpsert,
          groupBy: mockReactionGroupBy,
          deleteMany: mockReactionDeleteMany,
        },
        newsBookmark: {
          findUnique: mockBookmarkFindUnique,
          create: mockBookmarkCreate,
          delete: mockBookmarkDelete,
          count: mockBookmarkCount,
        },
      },
    };
  }
  if (request === "@/lib/auth-options") {
    return { authOptions: {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};

test.after(() => {
  (Module as any)._load = originalLoad;
});

const routesPromise = (async () => {
  const [viewModule, reactionModule, bookmarkModule] = await Promise.all([
    import("../../app/api/news/[slug]/view/route"),
    import("../../app/api/news/[slug]/reaction/route"),
    import("../../app/api/news/[slug]/bookmark/route"),
  ]);

  return {
    view: viewModule.POST,
    reactPost: reactionModule.POST,
    reactDelete: reactionModule.DELETE,
    bookmarkToggle: bookmarkModule.POST,
  };
})();

test("POST /api/news/[slug]/view requires authentication", async () => {
  mockGetServerSession.mock.resetCalls();
  mockFindFirst.mock.resetCalls();
  mockGetServerSession.mock.mockImplementationOnce(() => Promise.resolve(null));

  const { view } = await routesPromise;
  const res = await view(new Request("http://localhost/api/news/foo/view"), {
    params: { slug: "foo" },
  });

  assert.equal(res.status, 401);
  assert.equal(mockFindFirst.mock.calls.length, 0);
});

test("POST /api/news/[slug]/view increments view count", async () => {
  mockGetServerSession.mock.resetCalls();
  mockFindFirst.mock.resetCalls();
  mockUpdate.mock.resetCalls();

  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { companyId: "tenant-1" } }),
  );
  mockFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "post-1" }),
  );
  mockUpdate.mock.mockImplementationOnce(() =>
    Promise.resolve({ viewCount: 5 }),
  );

  const { view } = await routesPromise;
  const res = await view(new Request("http://localhost/api/news/foo/view"), {
    params: { slug: "foo" },
  });

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.viewCount, 5);

  const findArgs = mockFindFirst.mock.calls[0].arguments[0];
  assert.equal(findArgs.where.slug, "foo");
  assert.equal(findArgs.where.OR[0].companyId, "tenant-1");

  const updateArgs = mockUpdate.mock.calls[0].arguments[0];
  assert.equal(updateArgs.where.id, "post-1");
  assert.equal(updateArgs.data.viewCount.increment, 1);
});

test("POST /api/news/[slug]/reaction requires authentication", async () => {
  mockGetServerSession.mock.resetCalls();
  mockFindFirst.mock.resetCalls();
  mockReactionUpsert.mock.resetCalls();

  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { companyId: "tenant-1" } }),
  );

  const { reactPost } = await routesPromise;
  const res = await reactPost(
    new Request("http://localhost/api/news/foo/reaction", {
      method: "POST",
      body: JSON.stringify({ reaction: "like" }),
    }),
    { params: { slug: "foo" } },
  );

  assert.equal(res.status, 401);
  assert.equal(mockFindFirst.mock.calls.length, 0);
  assert.equal(mockReactionUpsert.mock.calls.length, 0);
});

test("POST /api/news/[slug]/reaction validates payload", async () => {
  mockGetServerSession.mock.resetCalls();
  mockFindFirst.mock.resetCalls();
  mockReactionUpsert.mock.resetCalls();

  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1" } }),
  );

  const { reactPost } = await routesPromise;
  const res = await reactPost(
    new Request("http://localhost/api/news/foo/reaction", { method: "POST" }),
    { params: { slug: "foo" } },
  );

  assert.equal(res.status, 400);
  assert.equal(mockFindFirst.mock.calls.length, 0);
});

test("POST /api/news/[slug]/reaction upserts and returns counts", async () => {
  mockGetServerSession.mock.resetCalls();
  mockFindFirst.mock.resetCalls();
  mockReactionUpsert.mock.resetCalls();
  mockReactionGroupBy.mock.resetCalls();

  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1" } }),
  );
  mockFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "post-1" }),
  );
  mockReactionUpsert.mock.mockImplementationOnce(() => Promise.resolve({}));
  mockReactionGroupBy.mock.mockImplementationOnce(() =>
    Promise.resolve([
      { reaction: "like", _count: { reaction: 3 } },
      { reaction: "heart", _count: { reaction: 1 } },
    ]),
  );

  const { reactPost } = await routesPromise;
  const res = await reactPost(
    new Request("http://localhost/api/news/foo/reaction", {
      method: "POST",
      body: JSON.stringify({ reaction: "like" }),
    }),
    { params: { slug: "foo" } },
  );

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.deepEqual(payload.reactions, { like: 3, heart: 1 });
  assert.equal(payload.userReaction, "like");

  const upsertArgs = mockReactionUpsert.mock.calls[0].arguments[0];
  assert.equal(upsertArgs.where.postId_userId.postId, "post-1");
  assert.equal(upsertArgs.where.postId_userId.userId, "user-1");
  assert.equal(upsertArgs.create.companyId, "tenant-1");
});

test("DELETE /api/news/[slug]/reaction removes reaction", async () => {
  mockGetServerSession.mock.resetCalls();
  mockFindFirst.mock.resetCalls();
  mockReactionDeleteMany.mock.resetCalls();
  mockReactionGroupBy.mock.resetCalls();

  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1" } }),
  );
  mockFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "post-1" }),
  );
  mockReactionDeleteMany.mock.mockImplementationOnce(() => Promise.resolve({ count: 1 }));
  mockReactionGroupBy.mock.mockImplementationOnce(() => Promise.resolve([]));

  const { reactDelete } = await routesPromise;
  const res = await reactDelete(
    new Request("http://localhost/api/news/foo/reaction", { method: "DELETE" }),
    { params: { slug: "foo" } },
  );

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.deepEqual(payload.reactions, {});
  assert.equal(payload.userReaction, null);

  const deleteArgs = mockReactionDeleteMany.mock.calls[0].arguments[0];
  assert.equal(deleteArgs.where.postId, "post-1");
  assert.equal(deleteArgs.where.userId, "user-1");
});

test("POST /api/news/[slug]/bookmark requires authentication", async () => {
  mockGetServerSession.mock.resetCalls();
  mockFindFirst.mock.resetCalls();
  mockBookmarkFindUnique.mock.resetCalls();

  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { companyId: "tenant-1" } }),
  );

  const { bookmarkToggle } = await routesPromise;
  const res = await bookmarkToggle(
    new Request("http://localhost/api/news/foo/bookmark", { method: "POST" }),
    { params: { slug: "foo" } },
  );

  assert.equal(res.status, 401);
  assert.equal(mockFindFirst.mock.calls.length, 0);
  assert.equal(mockBookmarkFindUnique.mock.calls.length, 0);
});

test("POST /api/news/[slug]/bookmark creates bookmark when absent", async () => {
  mockGetServerSession.mock.resetCalls();
  mockFindFirst.mock.resetCalls();
  mockBookmarkFindUnique.mock.resetCalls();
  mockBookmarkCreate.mock.resetCalls();
  mockBookmarkDelete.mock.resetCalls();
  mockBookmarkCount.mock.resetCalls();

  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1" } }),
  );
  mockFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "post-1" }),
  );
  mockBookmarkFindUnique.mock.mockImplementationOnce(() => Promise.resolve(null));
  mockBookmarkCreate.mock.mockImplementationOnce(() => Promise.resolve({ id: "bookmark-1" }));
  mockBookmarkCount.mock.mockImplementationOnce(() => Promise.resolve(3));

  const { bookmarkToggle } = await routesPromise;
  const res = await bookmarkToggle(
    new Request("http://localhost/api/news/foo/bookmark", { method: "POST" }),
    { params: { slug: "foo" } },
  );

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.isBookmarked, true);
  assert.equal(payload.bookmarkCount, 3);

  assert.equal(mockBookmarkCreate.mock.calls.length, 1);
  const createArgs = mockBookmarkCreate.mock.calls[0].arguments[0];
  assert.equal(createArgs.data.companyId, "tenant-1");
});

test("POST /api/news/[slug]/bookmark removes existing bookmark", async () => {
  mockGetServerSession.mock.resetCalls();
  mockFindFirst.mock.resetCalls();
  mockBookmarkFindUnique.mock.resetCalls();
  mockBookmarkCreate.mock.resetCalls();
  mockBookmarkDelete.mock.resetCalls();
  mockBookmarkCount.mock.resetCalls();

  mockGetServerSession.mock.mockImplementationOnce(() =>
    Promise.resolve({ user: { id: "user-1", companyId: "tenant-1" } }),
  );
  mockFindFirst.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "post-1" }),
  );
  mockBookmarkFindUnique.mock.mockImplementationOnce(() =>
    Promise.resolve({ id: "bookmark-1" }),
  );
  mockBookmarkDelete.mock.mockImplementationOnce(() => Promise.resolve({}));
  mockBookmarkCount.mock.mockImplementationOnce(() => Promise.resolve(1));

  const { bookmarkToggle } = await routesPromise;
  const res = await bookmarkToggle(
    new Request("http://localhost/api/news/foo/bookmark", { method: "POST" }),
    { params: { slug: "foo" } },
  );

  assert.equal(res.status, 200);
  const payload = await res.json();
  assert.equal(payload.isBookmarked, false);
  assert.equal(payload.bookmarkCount, 1);

  assert.equal(mockBookmarkDelete.mock.calls.length, 1);
  const deleteArgs = mockBookmarkDelete.mock.calls[0].arguments[0];
  assert.equal(deleteArgs.where.postId_userId.postId, "post-1");
  assert.equal(deleteArgs.where.postId_userId.userId, "user-1");
});

