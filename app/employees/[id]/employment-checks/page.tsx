'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { toast } from 'sonner';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';

export default function EmploymentChecksPage() {
  const params = useParams();
  const employeeId = typeof params?.id === 'string' ? params.id : '';

  const [typeOfCheck, setTypeOfCheck] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [dateOfIssue, setDateOfIssue] = useState('');
  const [dateOfExpiry, setDateOfExpiry] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    if (selectedFile) {
      handleUpload(selectedFile);
    }
  };

  const handleUpload = async (selectedFile: File) => {
    if (!selectedFile || !typeOfCheck || !documentNumber || !dateOfIssue || !dateOfExpiry) {
      toast.error('Please complete all fields and select a file.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('name', `${typeOfCheck} - ${documentNumber}`);
    formData.append('category', 'Employment Checks');
    formData.append('employeeId', employeeId);
    formData.append('documentNumber', documentNumber);
    formData.append('dateOfIssue', dateOfIssue);
    formData.append('expiryDate', dateOfExpiry);

    const res = await fetch('/api/documents/upload-employee', {
      method: 'POST',
      body: formData,
    });

    if (res.ok) {
      toast.success('Document uploaded successfully');
      setTypeOfCheck('');
      setDocumentNumber('');
      setDateOfIssue('');
      setDateOfExpiry('');
      setFile(null);
    } else {
      toast.error('Failed to upload document');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <h2 className="text-xl font-semibold">Upload Employment Check Document</h2>

      <div>
        <Label>Type of Check</Label>
        <Select value={typeOfCheck} onValueChange={setTypeOfCheck}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select check type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Passport">Passport</SelectItem>
            <SelectItem value="Visa">Visa</SelectItem>
            <SelectItem value="Right to Work">Right to Work</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Document Number</Label>
        <Input
          value={documentNumber}
          onChange={(e) => setDocumentNumber(e.target.value)}
          placeholder="E.g., ABC123456"
        />
      </div>

      <div>
        <Label>Date of Issue</Label>
        <Input
          type="date"
          value={dateOfIssue}
          onChange={(e) => setDateOfIssue(e.target.value)}
        />
      </div>

      <div>
        <Label>Date of Expiry</Label>
        <Input
          type="date"
          value={dateOfExpiry}
          onChange={(e) => setDateOfExpiry(e.target.value)}
        />
      </div>

      <div>
        <Label className="sr-only">Upload Document</Label>
        <Button
          disabled={!typeOfCheck || !documentNumber || !dateOfIssue || !dateOfExpiry || loading}
          className="w-full"
          onClick={() => document.getElementById('file-upload')?.click()}
        >
          {loading ? 'Uploading...' : 'Upload Document'}
        </Button>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
