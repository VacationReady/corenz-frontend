'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function WorkingPatternsPage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workingDays, setWorkingDays] = useState<Record<string, string>>({}); // day: type

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayTypes = ['FULL_DAY', 'HALF_DAY_AM', 'HALF_DAY_PM'];

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

    const daysPayload = Object.entries(workingDays).map(([day, type]) => ({
      day,
      type,
    }));

    const res = await fetch('/api/working-patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, days: daysPayload }),
    });

    if (res.ok) {
      toast.success('Working pattern created');
      setName('');
      setDescription('');
      setWorkingDays({});
      setOpen(false);
      fetchPatterns();
    } else {
      const errorData = await res.json();
      toast.error(errorData.message || 'Error creating working pattern');
    }
  };

  const handleArchive = async (id: string) => {
    const res = await fetch(`/api/working-patterns/${id}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      toast.success('Pattern archived');
      fetchPatterns();
    } else {
      toast.error('Error archiving pattern');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Working Patterns</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Pattern</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Working Pattern</DialogTitle>
            </DialogHeader>
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
                      <label htmlFor={day} className="text-sm">
                        {day}
                      </label>
                    </div>
                    {day in workingDays && (
                      <Select value={workingDays[day]} onValueChange={(value) => handleTypeChange(day, value)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select Type" />
                        </SelectTrigger>
                        <SelectContent>
                          {dayTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.replace('_', ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
              <Button onClick={handleSubmit} className="w-full mt-2">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="grid gap-4">
        {patterns.map((pattern) => (
          <Card key={pattern.id} className="p-4 flex justify-between items-center">
            <div>
              <h2 className="font-semibold">{pattern.name}</h2>
              <p className="text-sm text-gray-600">{pattern.description}</p>
              <p className="text-sm">
                Days: {pattern.days && pattern.days.length > 0
                  ? pattern.days.map((d: any) => `${d.day} (${d.type.replace('_', ' ')})`).join(', ')
                  : 'None'}
              </p>
            </div>
            <Button variant="danger" onClick={() => handleArchive(pattern.id)}>
              Archive
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
