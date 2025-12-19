import test from "node:test";
import assert from "node:assert/strict";
import { buildDynamicQuery } from "../app/lib/queryBuilder";
import {
  createFilterRule,
  createFilterGroup,
  createRootFilterGroup,
  serializeFilterGroup,
  deserializeFilterGroup,
  flattenFilterRules,
  flattenToLegacyFilters,
  addRuleToGroup,
  addGroupToGroup,
  removeNodeFromGroup,
  updateNodeInGroup,
  collectVisibleFields,
  isFilterGroup,
  isFilterRule,
  getFilterValidationError,
  type FilterGroup,
  type FilterRule,
  type FilterOperator,
} from "../app/lib/reportFilters";

test("createFilterRule creates a valid rule with defaults", () => {
  const rule = createFilterRule({ field: "User.email", operator: "equals" });
  
  assert.equal(rule.type, "rule");
  assert.equal(rule.field, "User.email");
  assert.equal(rule.operator, "equals");
  assert.equal(rule.hideFieldInResults, false);
  assert.ok(rule.id.startsWith("filter_rule_"));
});

test("createFilterGroup creates a valid group with defaults", () => {
  const group = createFilterGroup();
  
  assert.equal(group.type, "group");
  assert.equal(group.logicOperator, "AND");
  assert.deepEqual(group.children, []);
  assert.ok(group.id.startsWith("filter_group_"));
});

test("createRootFilterGroup creates root with specific ID", () => {
  const root = createRootFilterGroup();
  
  assert.equal(root.id, "filter_root");
  assert.equal(root.type, "group");
  assert.equal(root.logicOperator, "AND");
});

test("serializeFilterGroup preserves nested structure", () => {
  const rule1 = createFilterRule({ field: "User.firstName", operator: "equals", value: "John" });
  const rule2 = createFilterRule({ field: "User.lastName", operator: "contains", value: "Doe" });
  const nestedGroup = createFilterGroup({ logicOperator: "OR", children: [rule2] });
  const root = createFilterGroup({ logicOperator: "AND", children: [rule1, nestedGroup] });
  
  const serialized = serializeFilterGroup(root);
  
  assert.equal(serialized.type, "group");
  assert.equal(serialized.logicOperator, "AND");
  assert.equal(serialized.children?.length, 2);
  assert.equal(serialized.children?.[0].type, "rule");
  assert.equal(serialized.children?.[0].field, "User.firstName");
  assert.equal(serialized.children?.[1].type, "group");
  assert.equal(serialized.children?.[1].logicOperator, "OR");
});

test("deserializeFilterGroup handles flat array format (legacy)", () => {
  const legacy = [
    { id: "f1", field: "User.email", operator: "equals" as FilterOperator, value: "test@example.com" },
    { id: "f2", field: "User.status", operator: "equals" as FilterOperator, value: "active" },
  ];
  
  const group = deserializeFilterGroup(legacy);
  
  assert.equal(group.type, "group");
  assert.equal(group.logicOperator, "AND");
  assert.equal(group.children.length, 2);
  assert.equal(group.children[0].type, "rule");
  assert.equal((group.children[0] as FilterRule).field, "User.email");
});

test("deserializeFilterGroup handles nested group format", () => {
  const nested = {
    type: "group" as const,
    id: "root",
    logicOperator: "AND" as const,
    children: [
      {
        type: "rule" as const,
        id: "r1",
        field: "User.firstName",
        operator: "equals" as FilterOperator,
        value: "Alice",
      },
      {
        type: "group" as const,
        id: "g1",
        logicOperator: "OR" as const,
        children: [
          {
            type: "rule" as const,
            id: "r2",
            field: "User.age",
            operator: "greater_than" as FilterOperator,
            value: 18,
          },
        ],
      },
    ],
  };
  
  const group = deserializeFilterGroup(nested);
  
  assert.equal(group.type, "group");
  assert.equal(group.children.length, 2);
  assert.equal(isFilterRule(group.children[0]), true);
  assert.equal(isFilterGroup(group.children[1]), true);
  assert.equal((group.children[1] as FilterGroup).logicOperator, "OR");
});

test("flattenFilterRules extracts all rules from nested groups", () => {
  const rule1 = createFilterRule({ field: "User.email" });
  const rule2 = createFilterRule({ field: "User.status" });
  const rule3 = createFilterRule({ field: "User.role" });
  const nestedGroup = createFilterGroup({ children: [rule2, rule3] });
  const root = createFilterGroup({ children: [rule1, nestedGroup] });
  
  const flattened = flattenFilterRules(root);
  
  assert.equal(flattened.length, 3);
  assert.equal(flattened[0].field, "User.email");
  assert.equal(flattened[1].field, "User.status");
  assert.equal(flattened[2].field, "User.role");
});

test("flattenToLegacyFilters removes type discriminator", () => {
  const rule = createFilterRule({ field: "User.email", operator: "equals", value: "test@example.com" });
  const root = createFilterGroup({ children: [rule] });
  
  const legacy = flattenToLegacyFilters(root);
  
  assert.equal(legacy.length, 1);
  assert.equal(legacy[0].field, "User.email");
  assert.equal(legacy[0].operator, "equals");
  assert.equal(legacy[0].value, "test@example.com");
  // Verify type discriminator is not present in legacy format
  assert.equal("type" in legacy[0], false);
});

test("addRuleToGroup adds rule to specified group", () => {
  const root = createRootFilterGroup();
  const rule = createFilterRule({ field: "User.email" });
  
  const updated = addRuleToGroup(root, "filter_root", rule);
  
  assert.equal(updated.children.length, 1);
  assert.equal((updated.children[0] as FilterRule).field, "User.email");
});

test("addRuleToGroup adds rule to nested group", () => {
  const nestedGroup = createFilterGroup();
  const root = createFilterGroup({ children: [nestedGroup] });
  const rule = createFilterRule({ field: "User.status" });
  
  const updated = addRuleToGroup(root, nestedGroup.id, rule);
  
  assert.equal(updated.children.length, 1);
  const nested = updated.children[0] as FilterGroup;
  assert.equal(nested.children.length, 1);
  assert.equal((nested.children[0] as FilterRule).field, "User.status");
});

test("addGroupToGroup adds nested group", () => {
  const root = createRootFilterGroup();
  const newGroup = createFilterGroup({ logicOperator: "OR" });
  
  const updated = addGroupToGroup(root, "filter_root", newGroup);
  
  assert.equal(updated.children.length, 1);
  assert.equal((updated.children[0] as FilterGroup).logicOperator, "OR");
});

test("buildDynamicQuery preserves nested AND/OR grouping from FilterGroup", () => {
  const salesActive = createFilterGroup({
    logicOperator: "AND",
    children: [
      createFilterRule({ field: "User.department", operator: "equals", value: "Sales" }),
      createFilterRule({ field: "User.status", operator: "equals", value: "Active" }),
    ],
  });
  const opsPending = createFilterGroup({
    logicOperator: "AND",
    children: [
      createFilterRule({ field: "User.department", operator: "equals", value: "Ops" }),
      createFilterRule({ field: "User.status", operator: "equals", value: "Pending" }),
    ],
  });
  const root = createFilterGroup({ logicOperator: "OR", children: [salesActive, opsPending] });

  const { queries } = buildDynamicQuery({
    selectedFields: ["User.id"],
    filters: root,
    pagination: { page: 1, limit: 50 },
    sort: { field: "User.id", direction: "asc" },
  });

  assert.equal(queries.length, 1);

  const where = queries[0].prismaQuery.where;
  assert.deepEqual(where, {
    OR: [
      {
        AND: [
          { department: { equals: "Sales" } },
          { status: { equals: "Active" } },
        ],
      },
      {
        AND: [
          { department: { equals: "Ops" } },
          { status: { equals: "Pending" } },
        ],
      },
    ],
  });
});

test("removeNodeFromGroup removes rule by ID", () => {
  const rule1 = createFilterRule({ field: "User.email" });
  const rule2 = createFilterRule({ field: "User.status" });
  const root = createFilterGroup({ children: [rule1, rule2] });
  
  const updated = removeNodeFromGroup(root, rule1.id);
  
  assert.equal(updated.children.length, 1);
  assert.equal((updated.children[0] as FilterRule).id, rule2.id);
});

test("removeNodeFromGroup removes nested group", () => {
  const nestedGroup = createFilterGroup();
  const rule = createFilterRule({ field: "User.email" });
  const root = createFilterGroup({ children: [nestedGroup, rule] });
  
  const updated = removeNodeFromGroup(root, nestedGroup.id);
  
  assert.equal(updated.children.length, 1);
  assert.equal((updated.children[0] as FilterRule).field, "User.email");
});

test("updateNodeInGroup updates rule properties", () => {
  const rule = createFilterRule({ field: "User.email", operator: "equals", value: "old@example.com" });
  const root = createFilterGroup({ children: [rule] });
  
  const updated = updateNodeInGroup(root, rule.id, { value: "new@example.com" });
  
  assert.equal((updated.children[0] as FilterRule).value, "new@example.com");
  assert.equal((updated.children[0] as FilterRule).field, "User.email");
});

test("updateNodeInGroup updates group properties", () => {
  const nestedGroup = createFilterGroup({ logicOperator: "AND" });
  const root = createFilterGroup({ children: [nestedGroup] });
  
  const updated = updateNodeInGroup(root, nestedGroup.id, { logicOperator: "OR" });
  
  assert.equal((updated.children[0] as FilterGroup).logicOperator, "OR");
});

test("collectVisibleFields includes non-hidden filter fields", () => {
  const rule1 = createFilterRule({ field: "User.email", hideFieldInResults: false });
  const rule2 = createFilterRule({ field: "User.status", hideFieldInResults: true });
  const rule3 = createFilterRule({ field: "User.firstName", hideFieldInResults: false });
  const root = createFilterGroup({ children: [rule1, rule2, rule3] });
  
  const visible = collectVisibleFields(root);
  
  assert.equal(visible.length, 2);
  assert.ok(visible.includes("User.email"));
  assert.ok(visible.includes("User.firstName"));
  assert.ok(!visible.includes("User.status"));
});

test("collectVisibleFields excludes computed fields", () => {
  const rule1 = createFilterRule({ field: "User.email" });
  const rule2 = createFilterRule({ field: "_computed.fullName" });
  const root = createFilterGroup({ children: [rule1, rule2] });
  
  const visible = collectVisibleFields(root);
  
  assert.equal(visible.length, 1);
  assert.equal(visible[0], "User.email");
});

test("getFilterValidationError validates required fields", () => {
  const incompleteRule = createFilterRule({ field: "", operator: "equals" });
  
  const error = getFilterValidationError(incompleteRule);
  
  assert.equal(error, "Field is required");
});

test("getFilterValidationError validates operators without values", () => {
  const nullCheckRule = createFilterRule({ field: "User.email", operator: "is_null" });
  
  const error = getFilterValidationError(nullCheckRule);
  
  assert.equal(error, null);
});

test("getFilterValidationError validates operators requiring values", () => {
  const missingValueRule = createFilterRule({ field: "User.email", operator: "equals", value: "" });
  
  const error = getFilterValidationError(missingValueRule);
  
  assert.equal(error, "Value is required");
});

test("getFilterValidationError validates between operator", () => {
  const invalidBetween = createFilterRule({ 
    field: "User.age", 
    operator: "between", 
    value: 18,
    value2: undefined 
  });
  
  const error = getFilterValidationError(invalidBetween);
  
  assert.equal(error, "End value is required");
});

test("getFilterValidationError passes valid between operator", () => {
  const validBetween = createFilterRule({ 
    field: "User.age", 
    operator: "between", 
    value: 18,
    value2: 65 
  });
  
  const error = getFilterValidationError(validBetween);
  
  assert.equal(error, null);
});

test("hideFieldInResults flag is preserved through serialization", () => {
  const rule = createFilterRule({ 
    field: "User.password", 
    operator: "is_not_null",
    hideFieldInResults: true 
  });
  const root = createFilterGroup({ children: [rule] });
  
  const serialized = serializeFilterGroup(root);
  const deserialized = deserializeFilterGroup(serialized);
  
  const deserializedRule = deserialized.children[0] as FilterRule;
  assert.equal(deserializedRule.hideFieldInResults, true);
});

test("OR clause logic is preserved in nested groups", () => {
  const rule1 = createFilterRule({ field: "User.status", operator: "equals", value: "active" });
  const rule2 = createFilterRule({ field: "User.status", operator: "equals", value: "pending" });
  const orGroup = createFilterGroup({ logicOperator: "OR", children: [rule1, rule2] });
  const root = createFilterGroup({ logicOperator: "AND", children: [orGroup] });
  
  const serialized = serializeFilterGroup(root);
  const deserialized = deserializeFilterGroup(serialized);
  
  assert.equal((deserialized.children[0] as FilterGroup).logicOperator, "OR");
  assert.equal((deserialized.children[0] as FilterGroup).children.length, 2);
});

test("complex nested structure roundtrip", () => {
  // Build: (User.status = 'active' AND (User.role = 'admin' OR User.role = 'manager'))
  const statusRule = createFilterRule({ field: "User.status", operator: "equals", value: "active" });
  const adminRule = createFilterRule({ field: "User.role", operator: "equals", value: "admin" });
  const managerRule = createFilterRule({ field: "User.role", operator: "equals", value: "manager" });
  const roleGroup = createFilterGroup({ logicOperator: "OR", children: [adminRule, managerRule] });
  const root = createFilterGroup({ logicOperator: "AND", children: [statusRule, roleGroup] });
  
  const serialized = serializeFilterGroup(root);
  const deserialized = deserializeFilterGroup(serialized);
  const flattened = flattenFilterRules(deserialized);
  
  assert.equal(deserialized.logicOperator, "AND");
  assert.equal(deserialized.children.length, 2);
  assert.equal(flattened.length, 3);
  assert.equal((deserialized.children[1] as FilterGroup).logicOperator, "OR");
});
