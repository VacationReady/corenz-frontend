/* app/settings/working-patterns/page.tsx */

'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Checkbox } from '@/components/ui/Checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import Card from '@/components/ui/Card';
import { toast } from 'sonner';

export default function WorkingPatternsPage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workingDays, setWorkingDays] = useState<string[]>([]);

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const fetchPatterns = async () => {
    const res = await fetch('/api/working-patterns');
    const data = await res.json();
    setPatterns(data);
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleCheckboxChange = (day: string) => {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleSubmit = async () => {
    if (!name || workingDays.length === 0) {
      toast.error('Name and at least one working day are required');
      return;
    }

    const res = await fetch('/api/working-patterns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, workingDays }),
    });

    if (res.ok) {
      toast.success('Working pattern created');
      setName('');
      setDescription('');
      setWorkingDays([]);
      setOpen(false);
      fetchPatterns();
    } else {
      toast.error('Error creating working pattern');
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
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox
                      id={day}
                      checked={workingDays.includes(day)}
                      onCheckedChange={() => handleCheckboxChange(day)}
                    />
                    <label htmlFor={day} className="text-sm">
                      {day}
                    </label>
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
              <p className="text-sm">Days: {pattern.workingDays.join(', ')}</p>
            </div>
            <Button variant="destructive" onClick={() => handleArchive(pattern.id)}>
              Archive
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
