"use client";

import { useEffect, useState, FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { mutate } from "swr";

export default function NewContractTypeModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded?: () => void;
}) {
  const [label, setLabel] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Array<{ id: string; label: string }>>([]);

  const load = async () => {
    try {
      const res = await fetch("/api/contract-type-options");
      if (!res.ok) return setItems([]);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setItems(arr);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      setError("Label is required.");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/contract-type-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create option.");
        return;
      }
      mutate("/api/audience");
      onAdded?.();
      setLabel("");
      await load();
      setError("");
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await fetch("/api/contract-type-options", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await load();
    } catch {
      // no-op
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-4 space-y-4">
        <h3 className="text-lg font-semibold">Add Contract Type</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Contract type label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Close
            </Button>
            <Button type="submit" loading={loading}>
              Save
            </Button>
          </div>
        </form>

        <div className="space-y-2 max-h-56 overflow-auto">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{it.label}</span>
              <Button variant="danger" onClick={() => remove(it.id)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}


