'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/Input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/Select';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function EmploymentChecksPage() {
  const params = useParams();
  const employeeId = typeof params?.id === 'string' ? params.id : '';

  const [documents, setDocuments] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);

  const [typeOfCheck, setTypeOfCheck] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [dateOfIssue, setDateOfIssue] = useState('');
  const [dateOfExpiry, setDateOfExpiry] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch(
          `/api/documents/list-employee?employeeId=${employeeId}&category=Employment Checks`
        );
        const data = await res.json();
        setDocuments(data);
      } catch (error) {
        console.error('Failed to fetch documents:', error);
      }
    };

    if (employeeId) {
      fetchDocuments();
    }
  }, [employeeId]);

  const openEditModal = (doc: any) => {
    setSelectedDoc(doc);
    setTypeOfCheck(doc.name?.split(' - ')[0] || '');
    setDocumentNumber(doc.documentNumber || '');
    setDateOfIssue(doc.dateOfIssue ? doc.dateOfIssue.slice(0, 10) : '');
    setDateOfExpiry(doc.expiryDate ? doc.expiryDate.slice(0, 10) : '');
    setEditMode(true);
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!typeOfCheck || !documentNumber || !dateOfIssue || !dateOfExpiry) {
      toast.error('Please complete all fields.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      if (file) formData.append('file', file);
      formData.append('name', `${typeOfCheck} - ${documentNumber}`);
      formData.append('category', 'Employment Checks');
      formData.append('employeeId', employeeId);
      formData.append('documentNumber', documentNumber);
      formData.append('dateOfIssue', dateOfIssue);
      formData.append('expiryDate', dateOfExpiry);

      const url = editMode
        ? `/api/documents/update/${selectedDoc.id}`
        : '/api/documents/upload-employee';
      const method = editMode ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (res.ok) {
        const updatedDoc = await res.json();
        toast.success(editMode ? 'Document updated successfully' : 'Document uploaded successfully');

        if (editMode) {
          setDocuments((prev) =>
            prev.map((doc) => (doc.id === updatedDoc.id ? updatedDoc : doc))
          );
        } else {
          setDocuments((prev) => [...prev, updatedDoc]);
        }

        setTypeOfCheck('');
        setDocumentNumber('');
        setDateOfIssue('');
        setDateOfExpiry('');
        setFile(null);
        setOpen(false);
        setEditMode(false);
        setSelectedDoc(null);
      } else {
        toast.error('Failed to save document.');
      }
    } catch (error) {
      console.error('Error submitting document:', error);
      toast.error('An error occurred.');
    }

    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Employment Checks</h2>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditMode(false); setSelectedDoc(null); } }}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditMode(false); setSelectedDoc(null); }}>Add Document</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editMode ? 'Edit' : 'Add'} Employment Check Document</DialogTitle>
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
                <Label>{editMode ? 'Replace Document (optional)' : 'Upload Document'}</Label>
                <Input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading
                  ? editMode
                    ? 'Updating...'
                    : 'Uploading...'
                  : editMode
                    ? 'Update Document'
                    : 'Upload Document'}
              </Button>
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
            <TableRow
              key={doc.id}
              onClick={() => openEditModal(doc)}
              className="cursor-pointer hover:bg-muted"
            >
              <TableCell>{doc.name?.split(' - ')[0]}</TableCell>
              <TableCell>{doc.documentNumber || 'N/A'}</TableCell>
              <TableCell>
                {doc.dateOfIssue ? format(new Date(doc.dateOfIssue), 'dd/MM/yyyy') : 'N/A'}
              </TableCell>
              <TableCell>
                {doc.expiryDate ? format(new Date(doc.expiryDate), 'dd/MM/yyyy') : 'N/A'}
              </TableCell>
              <TableCell>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
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
