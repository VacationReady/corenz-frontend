"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import { History } from "lucide-react";
import HistoryModal from "./HistoryModal";

interface HistoryButtonProps {
  employeeId: string;
  section?: string;
  field?: string;
  title?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function HistoryButton({
  employeeId,
  section,
  field,
  title,
  variant = "outline",
  size = "sm",
  className,
}: HistoryButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        <History className="h-4 w-4 mr-2" />
        View History
      </Button>
      
      <HistoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employeeId={employeeId}
        section={section}
        field={field}
        title={title}
      />
    </>
  );
}
