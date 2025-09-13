"use client";

import { useEffect, useState, FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { mutate } from "swr";

export default function NewJobRoleModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded?: () => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);

  const load = async () => {
    try {
      const res = await fetch("/api/job-roles");
      if (!res.ok) return setRoles([]);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : data.jobRoles || [];
      setRoles(arr);
    } catch {
      setRoles([]);
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
      const res = await fetch("/api/job-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create job role.");
        return;
      }
      mutate("/api/audience");
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
      const res = await fetch("/api/job-roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to delete job role.");
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
        <h2 className="text-lg font-semibold">Manage Job Roles</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="space-y-2 max-h-64 overflow-auto border rounded p-2">
          {roles.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{r.name}</span>
              <Button size="sm" variant="danger" onClick={() => remove(r.id)} disabled={loading}>
                Delete
              </Button>
            </div>
          ))}
          {roles.length === 0 && (
            <p className="text-sm text-muted-foreground">No job roles yet.</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Job Role Name"
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
