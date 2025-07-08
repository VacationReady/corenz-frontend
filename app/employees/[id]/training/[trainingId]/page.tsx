'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

interface Course { id: string; name: string; }
interface Provider { id: string; name: string; }
interface Document { id: string; name: string; url: string; }

export default function EditTraining() {
  const router = useRouter();
  const params = useParams();
  const employeeId = Array.isArray(params?.id) ? params.id[0] : params?.id ?? '';
  const trainingId = Array.isArray(params?.trainingId) ? params.trainingId[0] : params?.trainingId ?? '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [dateCompleted, setDateCompleted] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [document, setDocument] = useState<Document | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, providersRes, recordRes] = await Promise.all([
          fetch('/api/courses/list'),
          fetch('/api/providers/list'),
          fetch(`/api/training-records/${trainingId}`),
        ]);
        const [coursesData, providersData, recordData] = await Promise.all([
          coursesRes.json(),
          providersRes.json(),
          recordRes.json(),
        ]);

        console.log('Fetched recordData:', recordData); // Debugging check

        setCourses(coursesData);
        setProviders(providersData);

        if (recordData.course?.id) {
          setSelectedCourse(recordData.course.id);
        }
        if (recordData.provider?.id) {
          setSelectedProvider(recordData.provider.id);
        }
        setDateCompleted(recordData.dateCompleted?.substring(0, 10) ?? '');
        setExpiryDate(recordData.expiryDate?.substring(0, 10) ?? '');
        setDocument(recordData.document);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    if (trainingId) fetchData();
  }, [trainingId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    const formData = new FormData(e.currentTarget);
    formData.append('courseId', selectedCourse);
    formData.append('providerId', selectedProvider);
    formData.append('dateCompleted', dateCompleted);
    formData.append('expiryDate', expiryDate);

    try {
      const res = await fetch(`/api/training-records/${trainingId}`, {
        method: 'PUT',
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
      alert('Update failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-6">
        <p>Loading training record...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-xl font-semibold">Edit Training Record</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Course</Label>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger>
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
        </div>

        <div>
          <Label>Provider</Label>
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger>
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
        </div>

        <div>
          <Label>Date Completed</Label>
          <Input
            type="date"
            value={dateCompleted}
            onChange={(e) => setDateCompleted(e.target.value)}
            required
          />
        </div>

        <div>
          <Label>Expiry Date</Label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
          />
        </div>

        <div>
          <Label>Upload New Certificate (optional)</Label>
          <Input name="file" type="file" accept="application/pdf,image/*" />
        </div>

        {document && (
          <div className="text-sm">
            <p>Current Document:</p>
            <a
              href={document.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {document.name}
            </a>
          </div>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'Updating...' : 'Update Training'}
        </Button>
      </form>
    </div>
  );
}
