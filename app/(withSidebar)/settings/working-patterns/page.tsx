"use client";

<<<<<<< HEAD
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Checkbox from "@/components/ui/Checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/Card";
import { toast } from "sonner";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/Select";
import KebabMenu from "@/components/ui/KebabMenu";
import Link from "next/link";
=======
import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select";
import KebabMenu from '@/components/ui/KebabMenu';
import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';
import { breadcrumbConfigs } from '@/components/ui/Breadcrumb';
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec

export default function WorkingPatternsPage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPattern, setCurrentPattern] = useState<any>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [weeks, setWeeks] = useState<any[]>([{ weekNumber: 1, days: {} }]);

  const [viewPattern, setViewPattern] = useState<any>(null);
  // Copy/Paste week clipboard (in-memory only)
  const clipboardRef = useRef<Record<string, string> | null>(null);

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayTypes = [
    { label: "Full Day", value: "FULL_DAY" },
    { label: "Half Day AM", value: "HALF_DAY_AM" },
    { label: "Half Day PM", value: "HALF_DAY_PM" },
  ];

  const fetchPatterns = async () => {
    const res = await fetch("/api/working-patterns");
    const data = await res.json();
    setPatterns(data);
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleCheckboxChange = (
    weekIndex: number,
    day: string,
    checked: boolean,
  ) => {
    setWeeks((prev) => {
      const updated = [...prev];
      const daysObj = { ...updated[weekIndex].days };
      if (checked) {
        daysObj[day] = "FULL_DAY";
      } else {
        delete daysObj[day];
      }
      updated[weekIndex].days = daysObj;
      return updated;
    });
  };

  const handleTypeChange = (weekIndex: number, day: string, type: string) => {
    setWeeks((prev) => {
      const updated = [...prev];
      updated[weekIndex].days[day] = type;
      return updated;
    });
  };

  const handleCopyWeek = (weekIndex: number) => {
    clipboardRef.current = { ...weeks[weekIndex].days };
    toast.success(`Copied week ${weeks[weekIndex].weekNumber}`);
  };

  const handlePasteWeek = (weekIndex: number) => {
    if (!clipboardRef.current) {
      toast.error("Nothing copied");
      return;
    }
    setWeeks((prev) => {
      const updated = [...prev];
      updated[weekIndex] = {
        ...updated[weekIndex],
        days: { ...clipboardRef.current },
      };
      return updated;
    });
    toast.success(`Pasted to week ${weeks[weekIndex].weekNumber}`);
  };

  const calendarPreview = useMemo(() => {
    // Build compact matrix preview of selected weeks/days
    return weeks.map((week) => days.map((d) => week.days[d] || null));
  }, [weeks]);

  const addWeek = () => {
    setWeeks((prev) => [...prev, { weekNumber: prev.length + 1, days: {} }]);
  };

  const removeWeek = (weekIndex: number) => {
    setWeeks((prev) => {
      const updated = prev.filter((_, idx) => idx !== weekIndex);
      return updated.map((w, idx) => ({ ...w, weekNumber: idx + 1 }));
    });
  };

  const handleSubmit = async () => {
    if (!name || weeks.every((w) => Object.keys(w.days).length === 0)) {
      toast.error("Name and at least one working day in any week are required");
      return;
    }

    const weeksPayload = weeks.map((week) => ({
      weekNumber: week.weekNumber,
      days: Object.entries(week.days).map(([day, type]) => ({ day, type })),
    }));

    const url =
      editMode && currentPattern
        ? `/api/working-patterns/${currentPattern.id}`
        : "/api/working-patterns";

    const method = editMode ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, description, weeks: weeksPayload }),
    });

    if (res.ok) {
      toast.success(`Working pattern ${editMode ? "updated" : "created"}`);
      setName("");
      setDescription("");
      setWeeks([{ weekNumber: 1, days: {} }]);
      setOpen(false);
      setEditMode(false);
      setCurrentPattern(null);
      fetchPatterns();
    } else {
      const errorData = await res.json();
      toast.error(
        errorData.message ||
          `Error ${editMode ? "updating" : "creating"} working pattern`,
      );
    }
  };

  const handleEdit = (pattern: any) => {
    setEditMode(true);
    setCurrentPattern(pattern);
    setName(pattern.name);
    setDescription(pattern.description || "");
    const loadedWeeks = pattern.weeks.map((week: any) => {
      const daysObj: Record<string, string> = {};
      week.days.forEach((d: any) => {
        daysObj[d.day] = d.type;
      });
      return { weekNumber: week.weekNumber, days: daysObj };
    });
    setWeeks(loadedWeeks);
    setOpen(true);
  };

  const handleArchive = async (id: string) => {
    const res = await fetch(`/api/working-patterns/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Pattern archived");
      fetchPatterns();
    } else {
      toast.error("Error archiving pattern");
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this pattern? This cannot be undone.",
      )
    )
      return;
    const res = await fetch(`/api/working-patterns/${id}?permanent=true`, {
      method: "DELETE",
    });
    if (res.ok) {
      toast.success("Pattern permanently deleted");
      fetchPatterns();
    } else {
      toast.error("Error deleting pattern");
    }
  };

  return (
    <PageShell
      title="Working Patterns"
      breadcrumbs={breadcrumbConfigs.settingsSection('Working Patterns')}
      showHomeIcon={false}
    >
      <div className="flex justify-between items-center mb-4">
        <div />
        <div className="flex space-x-2">
          <Link href="/settings/working-patterns/archived">
            <Button variant="ghost">View Archived</Button>
          </Link>
          <Dialog
            open={open}
            onOpenChange={(val) => {
              setOpen(val);
              if (!val) {
                setEditMode(false);
                setCurrentPattern(null);
                setWeeks([{ weekNumber: 1, days: {} }]);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button>{editMode ? "Editing Pattern" : "Add Pattern"}</Button>
            </DialogTrigger>
            <DialogContent>
              <div className="max-h-[80vh] overflow-y-auto space-y-4 p-2">
                <DialogHeader>
                  <DialogTitle>
                    {editMode
                      ? "Edit Working Pattern"
                      : "Create Working Pattern"}
                  </DialogTitle>
                </DialogHeader>
                <Input
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <Input
                  placeholder="Description (optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {weeks.map((week, weekIndex) => (
                  <div
                    key={weekIndex}
                    className="border p-2 rounded bg-gray-50"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Week {week.weekNumber}</h3>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCopyWeek(weekIndex)}
                        >
                          Copy week
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePasteWeek(weekIndex)}
                          disabled={!clipboardRef.current}
                        >
                          Paste to week
                        </Button>
                        {weeks.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeWeek(weekIndex)}
                          >
                            Remove Week
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {days.map((day) => (
                        <div key={day} className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`week-${weekIndex}-day-${day}`}
                              checked={day in week.days}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(
                                  weekIndex,
                                  day,
                                  Boolean(checked),
                                )
                              }
                            />
                            <label
                              htmlFor={`week-${weekIndex}-day-${day}`}
                              className="text-sm"
                            >
                              {day}
                            </label>
                          </div>
                          {day in week.days && (
                            <Select
                              value={week.days[day]}
                              onValueChange={(value) =>
                                handleTypeChange(weekIndex, day, value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                              <SelectContent>
                                {dayTypes.map((type) => (
                                  <SelectItem
                                    key={type.value}
                                    value={type.value}
                                  >
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Button variant="ghost" onClick={addWeek} className="w-full">
                  + Add Week
                </Button>
                <Button onClick={handleSubmit} className="w-full mt-2">
                  {editMode ? "Save Changes" : "Create"}
                </Button>
                {/* Read-only calendar preview */}
                <div className="mt-4">
                  <h4 className="font-medium mb-2">Calendar Preview</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border">
                      <thead>
                        <tr>
                          <th className="border px-2 py-1 text-left">Week</th>
                          {days.map((d) => (
                            <th
                              key={d}
                              className="border px-2 py-1 text-center"
                            >
                              {d}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {calendarPreview.map((weekRow, idx) => (
                          <tr key={idx}>
                            <td className="border px-2 py-1">{idx + 1}</td>
                            {weekRow.map((val, j) => (
                              <td
                                key={j}
                                className="border px-2 py-1 text-center"
                              >
                                {val ? val.replace(/_/g, " ") : ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!viewPattern} onOpenChange={() => setViewPattern(null)}>
        <DialogContent>
          {viewPattern && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">{viewPattern.name}</h2>
              <p className="text-sm text-gray-600">
                {viewPattern.description || "No description"}
              </p>
              {viewPattern.weeks.map((week: any) => (
                <div key={week.id} className="border rounded p-2">
                  <h3 className="font-medium mb-1">Week {week.weekNumber}</h3>
                  <ul className="text-sm list-disc list-inside">
                    {week.days.map((d: any) => (
                      <li key={d.id}>
                        {d.day} ({d.type.replace(/_/g, " ")})
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-4">
        {patterns.map((pattern) => {
          const days = pattern.weeks?.flatMap((w: any) => w.days) || [];
          const preview = days
            .slice(0, 3)
            .map((d: any) => `${d.day} (${d.type.replace(/_/g, " ")})`)
            .join(", ");
          return (
            <Card
              key={pattern.id}
              className="p-4 flex justify-between items-center"
            >
              <div>
                <h2 className="font-semibold">{pattern.name}</h2>
                <p className="text-sm text-gray-600">
                  {pattern.description || "No description"}
                </p>
                <p className="text-sm">{pattern.weeks.length} week pattern</p>
                <p className="text-sm text-gray-600">
                  Preview: {preview}
                  {days.length > 3 ? ` (+${days.length - 3} more)` : ""}
                </p>
              </div>
              <KebabMenu
                options={[
                  { label: "View", action: () => setViewPattern(pattern) },
                  { label: "Edit", action: () => handleEdit(pattern) },
                  { label: "Archive", action: () => handleArchive(pattern.id) },
                  { label: "Delete", action: () => handleDelete(pattern.id) },
                ]}
              />
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}
