import test from "node:test";
import assert from "node:assert/strict";

// Minimal replica of the condition evaluation used in EnhancedFormRenderer
function evaluateCondition(left: any, operator: string, right: any) {
  switch (operator) {
    case "equals":
      return left === right;
    case "notEquals":
      return left !== right;
    case "contains":
      return Array.isArray(left)
        ? left.includes(right)
        : String(left || "").includes(String(right ?? ""));
    case "notContains":
      return Array.isArray(left)
        ? !left.includes(right)
        : !String(left || "").includes(String(right ?? ""));
    case "greaterThan":
      return Number(left) > Number(right);
    case "greaterOrEqual":
      return Number(left) >= Number(right);
    case "lessThan":
      return Number(left) < Number(right);
    case "lessOrEqual":
      return Number(left) <= Number(right);
    case "isEmpty":
      return (
        left === undefined ||
        left === null ||
        left === "" ||
        (Array.isArray(left) && left.length === 0)
      );
    case "isNotEmpty":
      return !(
        left === undefined ||
        left === null ||
        left === "" ||
        (Array.isArray(left) && left.length === 0)
      );
    default:
      return true;
  }
}

test("logic evaluator compares primitives", () => {
  assert.equal(evaluateCondition(5, "greaterThan", 3), true);
  assert.equal(evaluateCondition(3, "lessOrEqual", 3), true);
  assert.equal(evaluateCondition("abc", "contains", "b"), true);
});

test("logic evaluator handles emptiness", () => {
  assert.equal(evaluateCondition([], "isEmpty", null), true);
  assert.equal(evaluateCondition([1], "isNotEmpty", null), true);
  assert.equal(evaluateCondition("", "isEmpty", null), true);
});


