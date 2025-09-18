import { describe, it } from "node:test";
import assert from "node:assert";

// Simple nested accessor test mirroring ReportsPreviewClient logic
function getNested(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc ? acc[key] : undefined), obj);
}

describe("CSV nested accessor", () => {
  it("reads nested relation values correctly", () => {
    const row = {
      User: { firstName: "Sam", department: { name: "Engineering" } },
      Employee: { isActive: true },
    };
    assert.strictEqual(getNested(row, "User.firstName"), "Sam");
    assert.strictEqual(getNested(row, "User.department.name"), "Engineering");
    assert.strictEqual(getNested(row, "Employee.isActive"), true);
  });
});


