import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const columns = [{ header: "ID", accessorKey: "id" }];
const data = [{ id: 1 }, { id: 2 }];

test("FilterableDataTable renders pagination controls with totals", async () => {
  const mod = await import("../app/components/reports/FilterableDataTable");
  const html = renderToStaticMarkup(
    React.createElement((mod as any).default, {
      columns,
      data,
      total: 25,
      page: 2,
      pageSize: 10,
    }),
  );

  assert(html.includes("Rows per page"));
  assert(html.includes("Page 2 of 3"));
  assert(html.includes("Showing 2 of 25 rows"));
});
