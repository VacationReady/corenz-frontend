"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Option = { id?: string; key: string; label: string; order?: number; active?: boolean };

export default function ManageGenderOptionsModal({ onClose }: { onClose: () => void }) {
  const [options, setOptions] = useState<Option[]>([]);
  const [error, setError] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/gender-options")
      .then((r) => r.json())
      .then((data) => setOptions(data))
      .catch(() => setOptions([]));
  }, []);

  const addRow = () => setOptions((prev) => [...prev, { key: "", label: "", order: prev.length }]);

  const updateRow = (idx: number, patch: Partial<Option>) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)));
  };

  const removeRow = (idx: number) => setOptions((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setError("");
    setSaving(true);
    try {
      for (let i = 0; i < options.length; i++) {
        const o = options[i];
        if (!o.key?.trim() || !o.label?.trim()) continue;
        await fetch("/api/gender-options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: o.key.trim(), label: o.label.trim(), order: i, active: true }),
        });
      }
      onClose();
    } catch (e: any) {
      setError(e?.message || "Failed to save options");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <Card className="w-full max-w-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Manage Gender Options</h2>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={addRow}>Add</Button>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="space-y-2 max-h-80 overflow-auto border rounded p-2 bg-section-background">
          {options.map((o, idx) => (
            <div key={idx} className="grid grid-cols-6 gap-2 items-center">
              <Input className="col-span-2" placeholder="Key (unique)" value={o.key} onChange={(e) => updateRow(idx, { key: e.target.value })} />
              <Input className="col-span-3" placeholder="Label" value={o.label} onChange={(e) => updateRow(idx, { label: e.target.value })} />
              <Button size="sm" variant="ghost" onClick={() => removeRow(idx)}>Remove</Button>
            </div>
          ))}
          {options.length === 0 && <p className="text-sm text-muted-foreground">No options yet. Click Add to create one.</p>}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </Card>
    </div>
  );
}


