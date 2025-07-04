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
  eventCategoryId: string;
  eventCategory: EventCategory;
  enforceEntitlement: boolean;
  noticePeriodDays: number;
  maxConcurrent: number | null;
  maxBookingLength?: number | null;
  maxCarryoverDays?: number | null;
  carryoverExpiryMonths?: number | null;
  blackoutDates: string[];
}

export default function EventRulesPage() {
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [rules, setRules] = useState<Record<string, EventRule>>({});
  const [loading, setLoading] = useState(false);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, ruleRes] = await Promise.all([
          fetch("/api/event-categories"),
          fetch("/api/event-rules"),
        ]);
        const catData: EventCategory[] = await catRes.json();
        const ruleData: EventRule[] = await ruleRes.json();

        const merged: Record<string, EventRule> = {};
        const openState: Record<string, boolean> = {};
        catData.forEach((cat) => {
          const existingRule = ruleData.find(
            (r) => r.eventCategoryId === cat.id
          );
          merged[cat.id] = existingRule || {
            eventCategoryId: cat.id,
            eventCategory: cat,
            enforceEntitlement: true,
            noticePeriodDays: 2,
            maxConcurrent: null,
            maxBookingLength: 14,
            maxCarryoverDays: null,
            carryoverExpiryMonths: null,
            blackoutDates: [],
          };
          openState[cat.id] = false;
        });
        setCategories(catData);
        setRules(merged);
        setOpenCards(openState);
      } catch (error) {
        console.error(error);
        toast.error("Failed to load event categories and rules.");
      }
    };
    fetchData();
  }, []);

  const refreshRules = async () => {
    try {
      const res = await fetch("/api/event-rules");
      const ruleData: EventRule[] = await res.json();
      setRules((prev) => {
        const updated = { ...prev };
        ruleData.forEach((r) => {
          updated[r.eventCategoryId] = r;
        });
        return updated;
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to refresh rules.");
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
          maxBookingLength: rule.maxBookingLength ?? 14,
          maxCarryoverDays: rule.maxCarryoverDays ?? null,
          carryoverExpiryMonths: rule.carryoverExpiryMonths ?? null,
          blackoutDates: rule.blackoutDates,
        }),
      });
      if (!res.ok) throw new Error("Failed to save rule.");
      toast.success(`Rule saved for ${rule.eventCategory.name}`);
      refreshRules();
    } catch (error) {
      console.error(error);
      toast.error("Error saving rule.");
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (id: string) => {
    setOpenCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-4">
      <h1 className="text-xl font-semibold">Event Rules Configuration</h1>
      {categories.length === 0 ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : (
        categories.map((cat: EventCategory) => {
          const rule = rules[cat.id];
          const isOpen = openCards[cat.id];
          return (
            <Card key={cat.id} className="p-4 space-y-2">
              <div
                className="flex justify-between items-center cursor-pointer"
                onClick={() => toggleCard(cat.id)}
              >
                <h2 className="text-lg font-medium">{cat.name}</h2>
                <span className="text-sm text-blue-600">
                  {isOpen ? "Collapse" : "Edit"}
                </span>
              </div>

              {isOpen && (
                <div className="space-y-4 mt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium">Enforce Entitlement</label>
                      <p className="text-xs text-gray-500">
                        Toggle to deduct leave from entitlement. Turn off for unpaid/discretionary leave.
                      </p>
                    </div>
                    <Switch
                      checked={rule.enforceEntitlement}
                      onChange={(value) =>
                        setRules((prev) => ({
                          ...prev,
                          [cat.id]: { ...rule, enforceEntitlement: value },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Notice Period (days)</label>
                    <p className="text-xs text-gray-500">
                      The minimum number of days notice required before leave can be booked.
                    </p>
                    <Input
                      type="number"
                      value={rule.noticePeriodDays}
                      onChange={(e) =>
                        setRules((prev) => ({
                          ...prev,
                          [cat.id]: {
                            ...rule,
                            noticePeriodDays: parseInt(e.target.value) || 0,
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Max Concurrent Off</label>
                    <p className="text-xs text-gray-500">
                      Maximum employees off simultaneously in this leave category and department. Leave blank for no limit.
                    </p>
                    <Input
                      type="number"
                      value={rule.maxConcurrent ?? ""}
                      onChange={(e) =>
                        setRules((prev) => ({
                          ...prev,
                          [cat.id]: {
                            ...rule,
                            maxConcurrent:
                              e.target.value === ""
                                ? null
                                : parseInt(e.target.value),
                          },
                        }))
                      }
                      placeholder="Leave blank for no limit"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Max Booking Length (days)</label>
                    <p className="text-xs text-gray-500">
                      Maximum number of days an employee can book in a single request.
                    </p>
                    <Input
                      type="number"
                      value={rule.maxBookingLength ?? 14}
                      onChange={(e) =>
                        setRules((prev) => ({
                          ...prev,
                          [cat.id]: {
                            ...rule,
                            maxBookingLength:
                              e.target.value === ""
                                ? 14
                                : parseInt(e.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Max Carryover Days</label>
                    <p className="text-xs text-gray-500">
                      Maximum unused days carried to next leave year. Leave blank to disable carryover.
                    </p>
                    <Input
                      type="number"
                      value={rule.maxCarryoverDays ?? ""}
                      onChange={(e) =>
                        setRules((prev) => ({
                          ...prev,
                          [cat.id]: {
                            ...rule,
                            maxCarryoverDays:
                              e.target.value === ""
                                ? null
                                : parseInt(e.target.value),
                            carryoverExpiryMonths:
                              e.target.value === "" ? null : rule.carryoverExpiryMonths,
                          },
                        }))
                      }
                      placeholder="Leave blank to disable carryover"
                    />
                  </div>
                  {rule.maxCarryoverDays !== null && (
                    <div>
                      <label className="block text-sm font-medium">Carryover Expiry (months after refresh)</label>
                      <p className="text-xs text-gray-500">
                        Number of months carryover days remain valid after leave year refresh. Leave blank for no expiry.
                      </p>
                      <Input
                        type="number"
                        value={rule.carryoverExpiryMonths ?? ""}
                        onChange={(e) =>
                          setRules((prev) => ({
                            ...prev,
                            [cat.id]: {
                              ...rule,
                              carryoverExpiryMonths:
                                e.target.value === ""
                                  ? null
                                  : parseInt(e.target.value),
                            },
                          }))
                        }
                        placeholder="Leave blank for no expiry"
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={() => handleSave(rule)} disabled={loading}>
                      {loading ? "Saving..." : "Save Rule"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
