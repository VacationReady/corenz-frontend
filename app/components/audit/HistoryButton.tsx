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
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  iconOnly?: boolean;
}

export default function HistoryButton({
  employeeId,
  section,
  field,
  title,
  variant = "outline",
  size = "sm",
  className,
  iconOnly = false,
}: HistoryButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={className}
      >
        <History className={`h-4 w-4 ${iconOnly ? "" : "mr-2"}`} />
        {iconOnly ? null : "View History"}
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
