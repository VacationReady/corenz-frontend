import test from "node:test";
import assert from "node:assert/strict";
import Module from "module";

test("DELETE /api/documents/delete removes Supabase object before deleting DB row", async () => {
  const originalLoad = (Module as any)._load;
  const removeCalls: string[][] = [];
  const deleteCalls: any[] = [];
  const supabaseState: { error: any } = { error: null };

  (Module as any)._load = function (
    request: string,
    parent: any,
    isMain: boolean,
  ) {
    if (request === "@/lib/prisma") {
      return {
        prisma: {
          document: {
            findFirst: async (args: any) => {
              if (args?.where?.id === "missing") return null;
              return {
                id: "doc-1",
                path: "documents/test.pdf",
                companyId: "company-1",
              };
            },
            delete: async (args: any) => {
              deleteCalls.push(args);
              return { id: args?.where?.id };
            },
          },
        },
      };
    }
    if (request === "@/lib/supabase-admin") {
      return {
        default: {
          storage: {
            from: () => ({
              remove: async (paths: string[]) => {
                removeCalls.push(paths);
                return { data: null, error: supabaseState.error };
              },
            }),
          },
        },
      };
    }
    if (request === "@/lib/auth-options") {
      return { authOptions: {} };
    }
    if (request === "next-auth") {
      return {
        getServerSession: async () => ({
          user: { companyId: "company-1", role: "ADMIN" },
        }),
      };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    const { DELETE } = await import("../app/api/documents/delete/route");

    supabaseState.error = null;
    const req = { json: async () => ({ documentId: "doc-1" }) } as Request;
    const res = await DELETE(req);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body, { success: true });
    assert.deepEqual(removeCalls.at(0), ["documents/test.pdf"]);
    assert.equal(deleteCalls.length, 1);
    assert.deepEqual(deleteCalls[0], { where: { id: "doc-1" } });

    supabaseState.error = { message: "storage failure" };
    const reqError = { json: async () => ({ documentId: "doc-1" }) } as Request;
    const resError = await DELETE(reqError);
    assert.equal(resError.status, 500);
    const errorBody = await resError.json();
    assert.equal(errorBody.error, "Failed to delete document file");
    assert.equal(deleteCalls.length, 1);
    assert.equal(removeCalls.length, 2);
  } finally {
    (Module as any)._load = originalLoad;
  }
});
