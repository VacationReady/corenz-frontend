import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import FieldSelection from "../app/components/reports/FieldSelection";

test("allows selecting fields from multiple models without warnings", () => {
  const html = renderToString(
    <FieldSelection
      selectedFields={["User.firstName", "Employee.startDate"]}
      onUpdateFields={() => {}}
      showSearch={false}
      showSelectedSummary={false}
    />
  );

  assert.doesNotMatch(html, /Multiple data models selected/);
  assert.doesNotMatch(html, /Reports currently support fields from a single data model/);
  assert.doesNotMatch(html, /Keep only User fields/);
  assert.doesNotMatch(html, /Keep only Employee fields/);
});
