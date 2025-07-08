'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface Course {
  id: string;
  name: string;
}

interface Provider {
  id: string;
  name: string;
}

export default function AddTraining() {
  const router = useRouter();
  const params = useParams();
  const employeeIdRaw = params?.id ?? '';
  const employeeId = Array.isArray(employeeIdRaw) ? employeeIdRaw[0] : employeeIdRaw;

  const [loading, setLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');

  // Modals
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newProviderName, setNewProviderName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const [coursesRes, providersRes] = await Promise.all([
        fetch('/api/courses/list'),
        fetch('/api/providers/list'),
      ]);
      const coursesData = await coursesRes.json();
      const providersData = await providersRes.json();
      setCourses(coursesData);
      setProviders(providersData);
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('employeeId', employeeId);
    formData.append('courseId', selectedCourse);
    formData.append('providerId', selectedProvider);

    try {
      const res = await fetch('/api/training-records/create', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        router.push(`/employees/${employeeId}/training`);
      } else {
        const error = await res.json();
        alert('Error: ' + error.error);
      }
    } catch (error) {
      console.error(error);
      alert('Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCourse = async () => {
    if (!newCourseName.trim()) return;
    const res = await fetch('/api/courses/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCourseName }),
    });
    const data = await res.json();
    setCourses((prev) => [...prev, data]);
    setSelectedCourse(data.id);
    setNewCourseName('');
    setIsCourseModalOpen(false);
  };

  const handleAddProvider = async () => {
    if (!newProviderName.trim()) return;
    const res = await fetch('/api/providers/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProviderName }),
    });
    const data = await res.json();
    setProviders((prev) => [...prev, data]);
    setSelectedProvider(data.id);
    setNewProviderName('');
    setIsProviderModalOpen(false);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Add Training Record</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Course</Label>
          <div className="flex gap-2">
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={() => setIsCourseModalOpen(true)}>
              +
            </Button>
          </div>
        </div>

        <div>
          <Label>Provider</Label>
          <div className="flex gap-2">
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" onClick={() => setIsProviderModalOpen(true)}>
              +
            </Button>
          </div>
        </div>

        <div>
          <Label>Date Completed</Label>
          <Input name="dateCompleted" type="date" required />
        </div>

        <div>
          <Label>Expiry Date (optional)</Label>
          <Input name="expiryDate" type="date" />
        </div>

        <div>
          <Label>Upload Certificate (optional)</Label>
          <Input name="file" type="file" accept="application/pdf,image/*" />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? 'Uploading...' : 'Add Training'}
        </Button>
      </form>

      {/* Course Modal */}
      <Dialog open={isCourseModalOpen} onOpenChange={setIsCourseModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Course</DialogTitle>
          </DialogHeader>
          <Input
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="Course Name"
          />
          <DialogFooter>
            <Button onClick={handleAddCourse}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider Modal */}
      <Dialog open={isProviderModalOpen} onOpenChange={setIsProviderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Provider</DialogTitle>
          </DialogHeader>
          <Input
            value={newProviderName}
            onChange={(e) => setNewProviderName(e.target.value)}
            placeholder="Provider Name"
          />
          <DialogFooter>
            <Button onClick={handleAddProvider}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
