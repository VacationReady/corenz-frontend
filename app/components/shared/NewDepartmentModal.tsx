"use client";

import { useEffect, useState, FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { mutate } from "swr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Departments</DialogTitle>
          <DialogDescription>Add or remove departments across your company.</DialogDescription>
        </DialogHeader>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <Card className="border rounded-2xl p-3 space-y-2 max-h-64 overflow-auto">
          {departments.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{d.name}</span>
              <Button
                type="button"
                size="sm"
                variant="danger"
                onClick={() => remove(d.id)}
                disabled={loading}
              >
                Delete
              </Button>
            </div>
          ))}
          {departments.length === 0 && (
            <p className="text-sm text-muted-foreground">No departments yet.</p>
          )}
        </Card>

        <form onSubmit={handleSubmit} className="space-y-3 mt-4">
          <Input
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            placeholder="Department Name"
            required
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Close
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
