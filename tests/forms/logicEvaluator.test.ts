import { describe, it, expect } from "vitest";

// Minimal replica of the condition evaluation used in EnhancedFormRenderer
function evaluateCondition(left: any, operator: string, right: any) {
  switch (operator) {
    case "equals":
      return left === right;
    case "notEquals":
      return left !== right;
    case "contains":
      return Array.isArray(left) ? left.includes(right) : String(left || "").includes(String(right ?? ""));
    case "notContains":
      return Array.isArray(left) ? !left.includes(right) : !String(left || "").includes(String(right ?? ""));
    case "greaterThan":
      return Number(left) > Number(right);
    case "greaterOrEqual":
      return Number(left) >= Number(right);
    case "lessThan":
      return Number(left) < Number(right);
    case "lessOrEqual":
      return Number(left) <= Number(right);
    case "isEmpty":
      return left === undefined || left === null || left === "" || (Array.isArray(left) && left.length === 0);
    case "isNotEmpty":
      return !(left === undefined || left === null || left === "" || (Array.isArray(left) && left.length === 0));
    default:
      return true;
  }
}

describe("logic evaluator", () => {
  it("compares primitives", () => {
    expect(evaluateCondition(5, "greaterThan", 3)).toBe(true);
    expect(evaluateCondition(3, "lessOrEqual", 3)).toBe(true);
    expect(evaluateCondition("abc", "contains", "b")).toBe(true);
  });

  it("handles emptiness", () => {
    expect(evaluateCondition([], "isEmpty", null)).toBe(true);
    expect(evaluateCondition([1], "isNotEmpty", null)).toBe(true);
    expect(evaluateCondition("", "isEmpty", null)).toBe(true);
  });
});


