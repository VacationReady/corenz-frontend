import { render, screen } from "@testing-library/react";
import { WorkflowCanvas } from "@/app/(withSidebar)/settings/automation-rules/components/WorkflowCanvas";

describe("Workflow Builder", () => {
  it("renders canvas with controls", () => {
    render(
      <WorkflowCanvas
        workflow={{ nodes: [], edges: [] }}
        onWorkflowChange={() => {}}
        onSave={() => {}}
        onTest={() => {}}
        isValid={true}
        isDirty={false}
      />,
    );
    expect(screen.getByRole("button", { name: /auto layout/i })).toBeInTheDocument();
  });
});


