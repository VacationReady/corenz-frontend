"use client";

import { useEffect, useState, FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { mutate } from "swr";

export default function NewLocationModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded?: (created: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Array<{ id: string; name: string }>>([]);

  const load = async () => {
    try {
      const res = await fetch("/api/locations");
      if (!res.ok) return setLocations([]);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setLocations(arr);
    } catch {
      setLocations([]);
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
      const res = await fetch("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create location.");
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
      await fetch("/api/locations", {
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
        <h3 className="text-lg font-semibold">Add Location</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Location name"
            value={name}
            onChange={(e) => setName(e.target.value)}
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
          {locations.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">{l.name}</span>
              <Button variant="danger" onClick={() => remove(l.id)}>
                Delete
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}


