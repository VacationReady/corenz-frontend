import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

const mockLeaves = [
  {
    id: "lr1",
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    dayType: "FULL_DAY",
    approvalStatus: "APPROVED",
    eventCategory: { id: "ec1", name: "Annual Leave" },
  },
  {
    id: "lr2",
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    dayType: "FULL_DAY",
    approvalStatus: "APPROVED",
    eventCategory: { id: "ec2", name: "Sick" },
  },
];

test("GET /api/employees/[id]/leave-requests supports upcoming filter and limit", async () => {
  const originalLoad = (Module as any)._load;
  (Module as any)._load = function (
    request: string,
    parent: any,
    isMain: boolean,
  ) {
    if (request === "@/lib/prisma") {
      return {
        prisma: {
          leaveRequest: {
            findMany: async (_args: any) => mockLeaves,
          },
        },
      };
    }
    if (request === "@/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "next-auth") {
      return {
        getServerSession: async () => ({ user: { id: "u1", companyId: "c1" } }),
      };
    }
    return originalLoad(request, parent, isMain);
  };

  const { GET } = await import(
    "../app/api/employees/[id]/leave-requests/route"
  );
  const url = new URL(
    "http://localhost/api/employees/e1/leave-requests?upcoming=true&limit=3",
  );
  const res = await GET({ url: url.toString() } as any, {
    params: { id: "e1" },
  });
  const data = await res.json();

  assert.ok(Array.isArray(data));
  assert.equal(data.length, 2);
  assert.ok(data[0].eventCategory?.name);
  (Module as any)._load = originalLoad;
});
