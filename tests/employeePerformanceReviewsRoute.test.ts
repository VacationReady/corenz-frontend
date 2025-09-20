import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const originalLoad = (Module as any)._load;

let mockEmployee: any = null;
let mockReviews: any[] = [];
let mockExistingReview: any = null;
let mockCreatedReviewer: any = null;
let mockUpdatedReviewer: any = null;
let lastFindManyArgs: any = null;
let lastCreateArgs: any = null;
let lastUpdateArgs: any = null;
let lastReviewLookupArgs: any = null;

const sessionContainer: { user: any } = {
  user: { id: "u-admin", companyId: "c1", role: "ADMIN" },
};

const mockPrisma = {
  employee: {
    findFirst: async () => mockEmployee,
  },
  employeePerformanceReview: {
    findMany: async (args: any) => {
      lastFindManyArgs = args;
      return mockReviews;
    },
    create: async (args: any) => {
      lastCreateArgs = args;
      return {
        id: args.data.id,
        employeeId: args.data.employeeId,
        companyId: args.data.companyId,
        reviewerId: args.data.reviewerId,
        reviewDate: args.data.reviewDate,
        rating: args.data.rating ?? null,
        summary: args.data.summary ?? null,
        strengths: args.data.strengths ?? null,
        areasForImprovement: args.data.areasForImprovement ?? null,
        goals: Array.isArray(args.data.goals) ? args.data.goals : [],
        createdAt:
          mockCreatedReviewer?.createdAt ?? new Date("2024-07-01T00:00:00Z"),
        updatedAt:
          mockCreatedReviewer?.updatedAt ?? new Date("2024-07-01T00:00:00Z"),
        Reviewer:
          mockCreatedReviewer?.Reviewer ??
          ({ id: "u-admin", firstName: "Jamie", lastName: "Lee" } as const),
      };
    },
    findFirst: async (args: any) => {
      lastReviewLookupArgs = args;
      return mockExistingReview;
    },
    update: async (args: any) => {
      lastUpdateArgs = args;
      return {
        id: args.where.id,
        employeeId: mockExistingReview?.employeeId ?? args.data.employeeId,
        companyId: mockExistingReview?.companyId ?? args.data.companyId,
        reviewerId: args.data.reviewerId,
        reviewDate: args.data.reviewDate,
        rating: args.data.rating ?? null,
        summary: args.data.summary ?? null,
        strengths: args.data.strengths ?? null,
        areasForImprovement: args.data.areasForImprovement ?? null,
        goals: Array.isArray(args.data.goals) ? args.data.goals : [],
        createdAt:
          mockUpdatedReviewer?.createdAt ?? new Date("2024-07-05T00:00:00Z"),
        updatedAt:
          mockUpdatedReviewer?.updatedAt ?? new Date("2024-07-06T00:00:00Z"),
        Reviewer:
          mockUpdatedReviewer?.Reviewer ??
          ({ id: "u-admin", firstName: "Jamie", lastName: "Lee" } as const),
      };
    },
  },
};

(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/lib/prisma") {
    return { prisma: mockPrisma };
  }
  if (request === "@/lib/auth-options") {
    return { authOptions: {} };
  }
  if (request === "next-auth") {
    return {
      getServerSession: async () => ({ user: sessionContainer.user }),
    };
  }
  return originalLoad(request, parent, isMain);
};

test.after(() => {
  (Module as any)._load = originalLoad;
});

test.beforeEach(() => {
  mockEmployee = { id: "emp1", userId: "employee-user" };
  mockReviews = [];
  mockExistingReview = null;
  mockCreatedReviewer = null;
  mockUpdatedReviewer = null;
  lastFindManyArgs = null;
  lastCreateArgs = null;
  lastUpdateArgs = null;
  lastReviewLookupArgs = null;
  sessionContainer.user = { id: "u-admin", companyId: "c1", role: "ADMIN" };
});

test("GET /api/employees/[id]/performance-reviews returns reviews", async () => {
  mockReviews = [
    {
      id: "rev1",
      employeeId: "emp1",
      companyId: "c1",
      reviewerId: "u-admin",
      reviewDate: new Date("2024-07-10T00:00:00Z"),
      rating: 4,
      summary: "Consistent delivery",
      strengths: "Collaboration",
      areasForImprovement: null,
      goals: ["Grow leadership", "Improve QA"],
      createdAt: new Date("2024-07-11T00:00:00Z"),
      updatedAt: new Date("2024-07-12T00:00:00Z"),
      Reviewer: { id: "u-admin", firstName: "Jamie", lastName: "Lee" },
    },
  ];

  const { GET } = await import(
    "../app/api/employees/[id]/performance-reviews/route?test=get"
  );

  const response = await GET(new Request("http://localhost/api"), {
    params: { id: "emp1" },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(Array.isArray(body));
  assert.equal(body[0].summary, "Consistent delivery");
  assert.deepEqual(lastFindManyArgs.where, {
    employeeId: "emp1",
    companyId: "c1",
  });
});

test(
  "POST /api/employees/[id]/performance-reviews normalises payload",
  async () => {
    const { POST } = await import(
      "../app/api/employees/[id]/performance-reviews/route?test=post"
    );

    const request = new Request("http://localhost/api", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewDate: "2024-07-01",
        rating: "4",
        summary: "  Strong quarter  ",
        strengths: "Collaboration",
        areasForImprovement: "",
        goals: "Launch project\nCoach peers",
      }),
    });

    const response = await POST(request, { params: { id: "emp1" } });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.ok(body.review);
    assert.equal(body.review.summary, "Strong quarter");
    assert.equal(lastCreateArgs.data.employeeId, "emp1");
    assert.equal(lastCreateArgs.data.companyId, "c1");
    assert.equal(lastCreateArgs.data.rating, 4);
    assert.deepEqual(lastCreateArgs.data.goals, [
      "Launch project",
      "Coach peers",
    ]);
  },
);

test("PUT /api/employees/[id]/performance-reviews updates review", async () => {
  mockExistingReview = {
    id: "rev1",
    employeeId: "emp1",
    companyId: "c1",
  };

  const { PUT } = await import(
    "../app/api/employees/[id]/performance-reviews/route?test=put"
  );

  const request = new Request("http://localhost/api", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "rev1",
      reviewDate: "2024-07-15",
      rating: 5,
      summary: "Updated summary",
      strengths: "Teamwork",
      areasForImprovement: "Time management",
      goals: ["Goal 1"],
    }),
  });

  const response = await PUT(request, { params: { id: "emp1" } });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.review);
  assert.equal(body.review.rating, 5);
  assert.deepEqual(lastReviewLookupArgs.where, {
    id: "rev1",
    employeeId: "emp1",
    companyId: "c1",
  });
  assert.equal(lastUpdateArgs.data.summary, "Updated summary");
  assert.deepEqual(lastUpdateArgs.data.goals, ["Goal 1"]);
});
