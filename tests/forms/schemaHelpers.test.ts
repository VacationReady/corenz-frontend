import test from "node:test";
import assert from "node:assert/strict";
import {
  isLegacySchema,
  upgradeLegacySchema,
  normalizeToPages,
  FormField,
  FormSchemaV2,
} from "@/api/forms/[id]/types";

test("detects legacy schema as array of fields", () => {
  const legacy: FormField[] = [
    { id: "a", type: "text", label: "A", required: false },
  ];
  assert.equal(isLegacySchema(legacy), true);
});

test("wraps legacy schema into a default section and page", () => {
  const legacy: FormField[] = [
    { id: "a", type: "text", label: "A", required: false },
    { id: "b", type: "number", label: "B", required: false },
  ];
  const v2 = upgradeLegacySchema(legacy);
  assert.equal(v2.version, 2);
  assert.equal(v2.sections?.[0]?.fields?.length, 2);
  const pages = normalizeToPages(legacy);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].sections[0].fields.length, 2);
});

test("normalizes sections-only V2 schema into pages", () => {
  const v2: FormSchemaV2 = {
    version: 2,
    sections: [
      { id: "s1", columns: 2, layout: "two-column", hidden: false, fields: [] },
    ],
  };
  const pages = normalizeToPages(v2);
  assert.equal(pages.length, 1);
  assert.equal(pages[0].sections.length, 1);
});
