"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";

export default function DebugPage() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Button onClick={() => setIsOpen(true)}>Open HeadlessUI Modal</Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Test HeadlessUI Modal"
      >
        <p>This modal is rendered using HeadlessUI and should work reliably in your environment.</p>
      </Modal>
    </div>
  );
}
