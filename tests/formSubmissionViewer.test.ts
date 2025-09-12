import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

const FormSubmissionViewer =
  require("../app/components/forms/FormSubmissionViewer").default;

test("renders answers for submission", () => {
  const schema = [{ id: "q1", label: "Question", type: "text" }];
  const answers = { q1: "Answer" };
  const html = renderToString(
    React.createElement(FormSubmissionViewer, { schema, answers }),
  );
  assert(html.includes("Question"));
  assert(html.includes("Answer"));
});
