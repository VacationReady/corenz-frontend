// /app/employees/[id]/employment-checks/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getSession } from 'next-auth/react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';
import { format } from 'date-fns';

export default function EmploymentChecksPage() {
  const params = useParams();
  const employeeId = params.id as string;

  const [documents, setDocuments] = useState<any[]>([]);
  const [typeOfCheck, setTypeOfCheck] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [dateOfIssue, setDateOfIssue] = useState('');
  const [dateOfExpiry, setDateOfExpiry] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      const res = await fetch(`/api/documents/list-employee?employeeId=${employeeId}&category=Employment Checks`);
      const data = await res.json();
      setDocuments(data);
    };
    fetchDocuments();
  }, [employeeId]);

  const handleUpload = async () => {
    if (!file || !typeOfCheck || !documentNumber || !dateOfIssue || !dateOfExpiry) {
      toast.error('Please complete all fields.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', `${typeOfCheck} - ${documentNumber}`);
    formData.append('category', 'Employment Checks');
    formData.append('documentNumber', documentNumber);
    formData.append('dateOfIssue', dateOfIssue);
    formData.append('expiryDate', dateOfExpiry);
    formData.append('employeeId', employeeId);

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
      const updated = await res.json();
      setDocuments((prev) => [...prev, updated]);
    } else {
      toast.error('Failed to upload document');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h2 className="text-2xl font-semibold">Employment Checks for Employee</h2>

      <div className="space-y-4">
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
            placeholder="E.g., 123456789"
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
          <Label>Document Upload</Label>
          <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <Button onClick={handleUpload} disabled={loading}>
          {loading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-2">Uploaded Documents</h3>
        {documents.length === 0 ? (
          <p className="text-gray-500">No documents uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="border p-2 rounded flex justify-between items-center"
              >
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-gray-600">
                    Issue: {doc.dateOfIssue ? format(new Date(doc.dateOfIssue), 'dd/MM/yyyy') : 'N/A'} | Expiry:{' '}
                    {doc.expiryDate ? format(new Date(doc.expiryDate), 'dd/MM/yyyy') : 'N/A'}
                  </p>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}