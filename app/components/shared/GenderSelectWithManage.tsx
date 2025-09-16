"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import ManageGenderOptionsModal from "@/components/shared/ManageGenderOptionsModal";

type GenderOption = { id: string; label: string };

export default function GenderSelectWithManage({
  value,
  options,
  onChange,
  name = "genderOptionId",
  placeholder = "Select gender",
}: {
  value?: string;
  options: GenderOption[];
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
}) {
  const [openManage, setOpenManage] = useState(false);
  const [items, setItems] = useState<GenderOption[]>(options);
  const [selected, setSelected] = useState<string | undefined>(value);

  useEffect(() => {
    setItems(options);
  }, [options]);

  useEffect(() => {
    setSelected(value);
  }, [value]);

  const refresh = async () => {
    try {
      const res = await fetch("/api/gender-options");
      if (!res.ok) return;
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {}
  };

  return (
    <>
      {/* Hidden input to integrate with surrounding HTML form submissions */}
      <input type="hidden" name={name} value={selected ?? ""} />

      <Select
        value={selected}
        onValueChange={(val) => {
          setSelected(val);
          onChange?.(val);
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((g) => (
            <SelectItem key={g.id} value={g.id}>
              {g.label}
            </SelectItem>
          ))}
          <div className="px-2 py-2">
            <Button
              variant="ghost"
              onClick={() => setOpenManage(true)}
            >
              + Add new option
            </Button>
          </div>
        </SelectContent>
      </Select>

      {openManage && (
        <ManageGenderOptionsModal
          onClose={async () => {
            setOpenManage(false);
            await refresh();
          }}
        />
      )}
    </>
  );
}


