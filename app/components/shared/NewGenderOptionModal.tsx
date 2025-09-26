"use client";

import { useEffect, useState, FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type GenderOption = { id: string; key: string; label: string };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function NewGenderOptionModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded?: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<GenderOption[]>([]);

  const load = async () => {
    try {
      const res = await fetch("/api/gender-options");
      if (!res.ok) return setOptions([]);
      const data = await res.json();
      setOptions(Array.isArray(data) ? data : []);
    } catch {
      setOptions([]);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    try {
      setLoading(true);
      const key = slugify(name);
      const order = options.length;
      const res = await fetch("/api/gender-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, label: name, order, active: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to create option.");
        return;
      }
      onAdded?.();
      setName("");
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
      setLoading(true);
      const res = await fetch("/api/gender-options", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete option.");
      } else {
        onAdded?.();
        await load();
        setError("");
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <Card className="w-full max-w-md p-4 space-y-4">
        <h2 className="text-lg font-semibold">Manage Gender Options</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="space-y-2 max-h-64 overflow-auto border rounded p-2">
          {options.map((o) => (
            <div key={o.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{o.label}</span>
              <Button size="sm" variant="danger" onClick={() => remove(o.id)} disabled={loading}>
                Delete
              </Button>
            </div>
          ))}
          {options.length === 0 && (
            <p className="text-sm text-muted-foreground">No options yet.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New option name"
            required
          />
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Close
            </Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Add"}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}


