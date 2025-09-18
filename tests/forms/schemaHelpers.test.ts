import { describe, it, expect } from "vitest";
import { isLegacySchema, upgradeLegacySchema, normalizeToPages, FormField, FormSchemaV2 } from "@/api/forms/[id]/types";

describe("schema helpers", () => {
  it("detects legacy schema as array of fields", () => {
    const legacy: FormField[] = [
      { id: "a", type: "text", label: "A", required: false },
    ];
    expect(isLegacySchema(legacy)).toBe(true);
  });

  it("wraps legacy schema into a default section and page", () => {
    const legacy: FormField[] = [
      { id: "a", type: "text", label: "A", required: false },
      { id: "b", type: "number", label: "B", required: false },
    ];
    const v2 = upgradeLegacySchema(legacy);
    expect(v2.version).toBe(2);
    expect(v2.sections?.[0]?.fields?.length).toBe(2);
    const pages = normalizeToPages(legacy);
    expect(pages.length).toBe(1);
    expect(pages[0].sections[0].fields.length).toBe(2);
  });

  it("normalizes sections-only V2 schema into pages", () => {
    const v2: FormSchemaV2 = {
      version: 2,
      sections: [
        { id: "s1", columns: 2, layout: "two-column", hidden: false, fields: [] },
      ],
    };
    const pages = normalizeToPages(v2);
    expect(pages.length).toBe(1);
    expect(pages[0].sections.length).toBe(1);
  });
});


