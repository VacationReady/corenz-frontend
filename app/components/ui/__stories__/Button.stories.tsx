import React from "react";
import Button from "../Button";
import { Save, Send } from "lucide-react";

const meta = {
  title: "UI/Button",
  component: Button,
};

export default meta;

export const Playground = {
  render: () => <Button>Primary action</Button>,
};

export const WithIcon = {
  render: () => (
    <Button icon={<Save className="h-4 w-4" />}>Save changes</Button>
  ),
};

export const Loading = {
  render: () => (
    <Button
      loading
      loadingText="Submitting..."
      icon={<Send className="h-4 w-4" />}
    >
      Submit form
    </Button>
  ),
};
