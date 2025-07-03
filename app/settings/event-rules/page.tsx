"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

interface EventCategory {
  id: string;
  name: string;
}

interface EventRule {
  id: string;
  eventCategoryId: string;
  enforceEntitlement: boolean;
  noticePeriodDays: number;
  maxConcurrent: number | null;
  blackoutDates: string[];
  eventCategory: EventCategory;
}

export default function EventRulesPage() {
  const [rules, setRules] = useState<EventRule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      const res = await fetch("/api/event-rules");
      const data = await res.json();
      setRules(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch event rules.");
    }
  };

  const handleSave = async (rule: EventRule) => {
    try {
      setLoading(true);
      const res = await fetch("/api/event-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventCategoryId: rule.eventCategoryId,
          enforceEntitlement: rule.enforceEntitlement,
          noticePeriodDays: rule.noticePeriodDays,
          maxConcurrent: rule.maxConcurrent,
          blackoutDates: rule.blackoutDates,
        }),
      });
      if (!res.ok) throw new Error("Failed to save.");
      toast.success(`Rule saved for ${rule.eventCategory.name}`);
      fetchRules();
    } catch (error) {
      console.error(error);
      toast.error("Error saving rule.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Event Rules Configuration</h1>
      {rules.length === 0 && <p className="text-sm text-gray-500">Loading...</p>}
      {rules.map((rule) => (
        <Card key={rule.id} className="p-4 space-y-2">
          <h2 className="text-lg font-medium">{rule.eventCategory.name}</h2>
          <div className="flex items-center justify-between">
            <label>Enforce Entitlement</label>
            <Switch
  checked={rule.enforceEntitlement}
  onChange={(value) =>
    setRules((prev) =>
      prev.map((r) =>
        r.id === rule.id ? { ...r, enforceEntitlement: value } : r
      )
    )
  }
/>
          </div>
          <div>
            <label className="block text-sm font-medium">Notice Period (days)</label>
            <Input
              type="number"
              value={rule.noticePeriodDays}
              onChange={(e) =>
                setRules((prev) =>
                  prev.map((r) =>
                    r.id === rule.id
                      ? { ...r, noticePeriodDays: parseInt(e.target.value) || 0 }
                      : r
                  )
                )
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Max Concurrent Off</label>
            <Input
              type="number"
              value={rule.maxConcurrent ?? ""}
              onChange={(e) =>
                setRules((prev) =>
                  prev.map((r) =>
                    r.id === rule.id
                      ? {
                          ...r,
                          maxConcurrent: e.target.value === ""
                            ? null
                            : parseInt(e.target.value),
                        }
                      : r
                  )
                )
              }
              placeholder="Leave blank for no limit"
            />
          </div>
          <Button
            onClick={() => handleSave(rule)}
            disabled={loading}
            className="mt-2"
          >
            {loading ? "Saving..." : "Save Rule"}
          </Button>
        </Card>
      ))}
    </div>
  );
}
