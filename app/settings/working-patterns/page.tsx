// ✅ Updated Working Patterns Page with Kebab Menu, Archive Link, Permanent Delete

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
  const [workingDays, setWorkingDays] = useState<Record<string, string>>({});

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

  const handleCheckboxChange = (day: string, checked: boolean) => {
    setWorkingDays((prev) => {
      const updated = { ...prev };
      if (checked) {
        updated[day] = 'FULL_DAY';
      } else {
        delete updated[day];
      }
      return updated;
    });
  };

  const handleTypeChange = (day: string, type: string) => {
    setWorkingDays((prev) => ({
      ...prev,
      [day]: type,
    }));
  };

  const handleSubmit = async () => {
    if (!name || Object.keys(workingDays).length === 0) {
      toast.error('Name and at least one working day are required');
      return;
    }

    const daysPayload = Object.entries(workingDays).map(([day, type]) => ({ day, type }));

    const url = editMode && currentPattern
      ? `/api/working-patterns/${currentPattern.id}`
      : '/api/working-patterns';

    const method = editMode ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, days: daysPayload }),
    });

    if (res.ok) {
      toast.success(`Working pattern ${editMode ? 'updated' : 'created'}`);
      setName('');
      setDescription('');
      setWorkingDays({});
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
    const wd: Record<string, string> = {};
    pattern.days.forEach((d: any) => {
      wd[d.day] = d.type;
    });
    setWorkingDays(wd);
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
            <Button variant="secondary">View Archived</Button>
          </Link>
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditMode(false); setCurrentPattern(null); } }}>
            <DialogTrigger asChild>
              <Button>{editMode ? 'Editing Pattern' : 'Add Pattern'}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editMode ? 'Edit Working Pattern' : 'Create Working Pattern'}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                {editMode && currentPattern && (
                  <div className="border p-2 rounded bg-gray-50">
                    <h3 className="font-semibold mb-2">Current</h3>
                    <p><span className="font-medium">Name:</span> {currentPattern.name}</p>
                    <p><span className="font-medium">Description:</span> {currentPattern.description || 'None'}</p>
                    <p className="font-medium mt-2">Days:</p>
                    {currentPattern.days.map((d: any) => (
                      <p key={d.day}>{d.day}: {d.type.replace('_', ' ')}</p>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                  <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} />
                  <div className="grid grid-cols-4 gap-2">
                    {days.map((day) => (
                      <div key={day} className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={day}
                            checked={day in workingDays}
                            onCheckedChange={(checked) => handleCheckboxChange(day, Boolean(checked))}
                          />
                          <label htmlFor={day} className="text-sm">{day}</label>
                        </div>
                        {day in workingDays && (
                          <Select
                            value={workingDays[day]}
                            onChange={(value) => handleTypeChange(day, value)}
                            options={dayTypes}
                            placeholder="Select type"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <Button onClick={handleSubmit} className="w-full mt-2">
                    {editMode ? 'Save Changes' : 'Create'}
                  </Button>
                </div>
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
                Days: {pattern.days && pattern.days.length > 0
                  ? pattern.days.map((d: any) => `${d.day} (${d.type.replace('_', ' ')})`).join(', ')
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
