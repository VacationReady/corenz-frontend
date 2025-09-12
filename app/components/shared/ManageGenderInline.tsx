"use client";

import { useState } from "react";
import ManageGenderOptionsModal from "@/components/shared/ManageGenderOptionsModal";

export default function ManageGenderInline() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2 text-right">
      <button
        className="text-xs text-primary hover:underline"
        type="button"
        onClick={() => setOpen(true)}
      >
        Manage options
      </button>
      {open && <ManageGenderOptionsModal onClose={() => setOpen(false)} />}
    </div>
  );
}
