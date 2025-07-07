```tsx
// /app/employees/[id]/employment-checks/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EmploymentChecksPage() {
  const params = useParams();
  const employeeId = typeof params?.id === 'string' ? params.id : '';

  const [documents, setDocuments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

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
      toast.error('Please complete all fields and select a file.');
      return;
    }
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
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
      setOpen(false);
      const updated = await res.json();
      setDocuments((prev) => [...prev, updated]);
    } else {
      toast.error('Failed to upload document');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Employment Checks</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Add Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Employment Check Document</DialogTitle>
            </DialogHeader>
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
                <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="E.g., ABC123456" />
              </div>
              <div>
                <Label>Date of Issue</Label>
                <Input type="date" value={dateOfIssue} onChange={(e) => setDateOfIssue(e.target.value)} />
              </div>
              <div>
                <Label>Date of Expiry</Label>
                <Input type="date" value={dateOfExpiry} onChange={(e) => setDateOfExpiry(e.target.value)} />
              </div>
              <div>
                <Label>Upload Document</Label>
                <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>
              <Button onClick={handleUpload} disabled={loading}>{loading ? 'Uploading...' : 'Upload Document'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type of Check</TableHead>
            <TableHead>Document Number</TableHead>
            <TableHead>Date of Issue</TableHead>
            <TableHead>Date of Expiry</TableHead>
            <TableHead>Download</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell>{doc.name?.split(' - ')[0]}</TableCell>
              <TableCell>{doc.documentNumber || 'N/A'}</TableCell>
              <TableCell>{doc.dateOfIssue ? format(new Date(doc.dateOfIssue), 'dd/MM/yyyy') : 'N/A'}</TableCell>
              <TableCell>{doc.expiryDate ? format(new Date(doc.expiryDate), 'dd/MM/yyyy') : 'N/A'}</TableCell>
              <TableCell>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Download
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
```
