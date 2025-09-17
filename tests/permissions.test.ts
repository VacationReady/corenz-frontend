import test from "node:test";
import assert from "node:assert/strict";
import { resolvePermissions, hasPermission } from "@/lib/permissions";

test("EMPLOYEE defaults include documents read and leave-requests edit", () => {
  const user = { role: "EMPLOYEE", permissionProfile: null } as any;
  const perms = resolvePermissions(user);
  assert.ok(Array.isArray(perms["documents"]))
  assert.equal(hasPermission(user, "documents", "read"), true);
  assert.equal(hasPermission(user, "leave-requests", "edit"), true);
});

test("MANAGER defaults include employees edit and reports read", () => {
  const user = { role: "MANAGER", permissionProfile: null } as any;
  const perms = resolvePermissions(user);
  assert.equal(hasPermission(user, "employees", "edit"), true);
  assert.equal(hasPermission(user, "reports", "read"), true);
});

test("ADMIN without custom profile has admin override (all screens)", () => {
  const user = { role: "ADMIN", permissionProfile: null } as any;
  // A screen not in defaults should still pass due to admin override
  assert.equal(hasPermission(user, "nonexistent-screen", "read"), true);
});


