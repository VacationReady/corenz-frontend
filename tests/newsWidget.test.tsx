import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

// Render the component server-side to verify it renders the shell without data
test("NewsWidget SSR renders shell without crashing", async () => {
  const mod = await import("../app/components/dashboard/NewsWidget");
  const html = renderToString(
    React.createElement((mod as any).NewsWidget, { limit: 2 }),
  );
  assert.ok(html.includes("Latest News"));
});
