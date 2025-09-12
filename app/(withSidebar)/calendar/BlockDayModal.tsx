"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import { toast } from "sonner";

interface EventCategory {
  id: string;
  name: string;
}

export default function BlockDayModal({
  open,
  setOpen,
  selectedDate,
  refreshEvents,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  selectedDate: Date;
  refreshEvents: () => void;
}) {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [blockAll, setBlockAll] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch("/api/event-categories");
        const data = await res.json();
        setCategories(data);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load event categories");
      }
    };
    if (open) fetchCategories();
  }, [open]);

  const handleToggleCategory = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const eventCategoryIds = blockAll ? [] : selected;
      const res = await fetch("/api/blackout-days/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          allEvents: blockAll,
          eventCategoryIds,
          companyId: "default-company-id",
        }),
      });
      if (!res.ok) throw new Error("Failed to block day.");
      toast.success("Day blocked successfully");
      await refreshEvents();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to block day.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block {selectedDate.toDateString()}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Block for all events?
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="blockAll"
                  checked={blockAll}
                  onChange={() => setBlockAll(true)}
                />
                Yes
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="blockAll"
                  checked={!blockAll}
                  onChange={() => setBlockAll(false)}
                />
                No
              </label>
            </div>
          </div>

          {!blockAll && (
            <div className="space-y-1 max-h-40 overflow-y-auto border p-2 rounded">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2">
                  <Checkbox
                    id={cat.id}
                    checked={selected.includes(cat.id)}
                    onCheckedChange={() => handleToggleCategory(cat.id)}
                  />
                  <span>{cat.name}</span>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Note (optional)</label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for blocking the day"
            />
          </div>

          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Blocking..." : "Block Day"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
