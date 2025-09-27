"use client";

import { useEffect, useState, FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { mutate } from "swr";

export default function NewDepartmentModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded?: (created?: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);

  const load = async () => {
    try {
      const res = await fetch("/api/departments");
      if (!res.ok) return setDepartments([]);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.departments || [];
      setDepartments(arr);
    } catch {
      setDepartments([]);
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
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create department.");
        return;
      }
      const created = await res.json();
      mutate("/api/audience");
      onAdded?.(created);
      setName("");
      setError("");
      onClose();
    } catch {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/departments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete department.");
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
        <h2 className="text-lg font-semibold">Manage Departments</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="space-y-2 max-h-64 overflow-auto border rounded p-2">
          {departments.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{d.name}</span>
              <Button size="sm" variant="danger" onClick={() => remove(d.id)} disabled={loading}>
                Delete
              </Button>
            </div>
          ))}
          {departments.length === 0 && (
            <p className="text-sm text-muted-foreground">No departments yet.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department Name"
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
