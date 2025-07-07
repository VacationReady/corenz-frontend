'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';

export default function AddDriverLicence() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id ?? '';

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('employeeId', employeeId);

    try {
      const res = await fetch('/api/driver-licenses/create', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        router.push(`/employees/${employeeId}/driver-licenses`);
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

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Add Driver Licence</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Type</Label>
          <Input name="type" type="text" placeholder="e.g., Full NZ Car" required />
        </div>

        <div>
          <Label>Licence Number</Label>
          <Input name="licenceNumber" type="text" placeholder="Licence Number" required />
        </div>

        <div>
          <Label>Issue Date</Label>
          <Input name="issueDate" type="date" required />
        </div>

        <div>
          <Label>Expiry Date</Label>
          <Input name="expiryDate" type="date" required />
        </div>

        <div>
          <Label>Upload Document (optional)</Label>
          <Input name="file" type="file" accept="application/pdf,image/*" />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? 'Uploading...' : 'Add Licence'}
        </Button>
      </form>
    </div>
  );
}
