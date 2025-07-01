'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import Select from '@/components/ui/Select';
import KebabMenu from '@/components/ui/KebabMenu';
import Link from 'next/link';

export default function WorkingPatternsPage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentPattern, setCurrentPattern] = useState<any>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [weeks, setWeeks] = useState<any[]>([
    { weekNumber: 1, days: {} }
  ]);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayTypes = [
    { label: 'Full Day', value: 'FULL_DAY' },
    { label: 'Half Day AM', value: 'HALF_DAY_AM' },
    { label: 'Half Day PM', value: 'HALF_DAY_PM' },
  ];

  const fetchPatterns = async () => {
    const res = await fetch('/api/working-patterns');
    const data = await res.json();
    setPatterns(data);
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleCheckboxChange = (weekIndex: number, day: string, checked: boolean) => {
    setWeeks((prev) => {
      const updated = [...prev];
      const daysObj = { ...updated[weekIndex].days };
      if (checked) {
        daysObj[day] = 'FULL_DAY';
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
    if (!name || weeks.every(w => Object.keys(w.days).length === 0)) {
      toast.error('Name and at least one working day in any week are required');
      return;
    }

    const weeksPayload = weeks.map((week) => ({
      weekNumber: week.weekNumber,
      days: Object.entries(week.days).map(([day, type]) => ({ day, type })),
    }));

    const url = editMode && currentPattern
      ? `/api/working-patterns/${currentPattern.id}`
      : '/api/working-patterns';

    const method = editMode ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, weeks: weeksPayload }),
    });

    if (res.ok) {
      toast.success(`Working pattern ${editMode ? 'updated' : 'created'}`);
      setName('');
      setDescription('');
      setWeeks([{ weekNumber: 1, days: {} }]);
      setOpen(false);
      setEditMode(false);
      setCurrentPattern(null);
      fetchPatterns();
    } else {
      const errorData = await res.json();
      toast.error(errorData.message || `Error ${editMode ? 'updating' : 'creating'} working pattern`);
    }
  };

  const handleEdit = (pattern: any) => {
    setEditMode(true);
    setCurrentPattern(pattern);
    setName(pattern.name);
    setDescription(pattern.description || '');
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
    const res = await fetch(`/api/working-patterns/${id}`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Pattern archived');
      fetchPatterns();
    } else {
      toast.error('Error archiving pattern');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this pattern? This cannot be undone.')) return;
    const res = await fetch(`/api/working-patterns/${id}?permanent=true`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Pattern permanently deleted');
      fetchPatterns();
    } else {
      toast.error('Error deleting pattern');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Working Patterns</h1>
        <div className="flex space-x-2">
          <Link href="/settings/working-patterns/archived">
            <Button variant="ghost">View Archived</Button>
          </Link>
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditMode(false); setCurrentPattern(null); setWeeks([{ weekNumber: 1, days: {} }]); } }}>
            <DialogTrigger asChild>
              <Button>{editMode ? 'Editing Pattern' : 'Add Pattern'}</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editMode ? 'Edit Working Pattern' : 'Create Working Pattern'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                {weeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="border p-2 rounded bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium">Week {week.weekNumber}</h3>
                      {weeks.length > 1 && (
                        <Button size="sm" variant="ghost" onClick={() => removeWeek(weekIndex)}>Remove Week</Button>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {days.map((day) => (
                        <div key={day} className="flex flex-col space-y-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`week-${weekIndex}-day-${day}`}
                              checked={day in week.days}
                              onCheckedChange={(checked) => handleCheckboxChange(weekIndex, day, Boolean(checked))}
                            />
                            <label htmlFor={`week-${weekIndex}-day-${day}`} className="text-sm">{day}</label>
                          </div>
                          {day in week.days && (
                            <Select
                              value={week.days[day]}
                              onChange={(value) => handleTypeChange(weekIndex, day, value)}
                              options={dayTypes}
                              placeholder="Select type"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Button variant="ghost" onClick={addWeek} className="w-full">+ Add Week</Button>
                <Button onClick={handleSubmit} className="w-full mt-2">
                  {editMode ? 'Save Changes' : 'Create'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid gap-4">
        {patterns.map((pattern) => (
          <Card key={pattern.id} className="p-4 flex justify-between items-center">
            <div>
              <h2 className="font-semibold">{pattern.name}</h2>
              <p className="text-sm text-gray-600">{pattern.description || 'No description'}</p>
              <p className="text-sm">
                Days: {pattern.weeks && pattern.weeks.length > 0
                  ? pattern.weeks.flatMap((w: any) => w.days.map((d: any) => `${d.day} (${d.type.replace('_', ' ')})`)).join(', ')
                  : 'None'}
              </p>
            </div>
            <KebabMenu
              options={[
                { label: 'Edit', action: () => handleEdit(pattern) },
                { label: 'Archive', action: () => handleArchive(pattern.id) },
                { label: 'Delete', action: () => handleDelete(pattern.id) },
              ]}
            />
          </Card>
        ))}
      </div>
    </div>
  );
}
