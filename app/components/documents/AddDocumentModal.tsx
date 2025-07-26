'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useSession } from 'next-auth/react';
import { fetchEmployees, fetchDepartments } from '@/lib/fetchData';
import { uploadToSupabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function AddDocumentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: session } = useSession();
  const [type, setType] = useState<'employee' | 'company' | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const user = session?.user;

  const categories = [
    'Contract',
    'Visa',
    'Right to Work',
    'Passport',
    'Training Certificate',
    'ID Document',
    'Policy',
    'Performance Review',
    'Other',
  ];

  const handleSubmit = async () => {
    if (!title || !file || !user?.id) {
      toast.error('Title, file, and user must be provided');
      return;
    }

    setLoading(true);

    try {
      const upload = await uploadToSupabase(file);
      if (!upload?.url || !upload?.path) throw new Error('File upload failed');

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: JSON.stringify({
          name: title,
          category,
          description,
          path: upload.path,
          size: file.size,
          type: file.type,
          url: upload.url,
          uploaderId: user.id,
          companyId: user.companyId,
          employeeId: type === 'employee' ? employeeId : undefined,
          departmentId: type === 'company' && departmentId !== 'all' ? departmentId : undefined,
        }),
      });

      if (!res.ok) throw new Error('API call failed');

      toast.success('Document uploaded successfully');
      onClose();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload New Document</DialogTitle>
        </DialogHeader>

        {/* Step 1: Type Selector */}
        <div className="flex gap-4">
          <div
            onClick={() => setType('employee')}
            className={`flex-1 border p-4 rounded-xl cursor-pointer ${type === 'employee' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <h4 className="font-semibold mb-1">Employee Document</h4>
            <p className="text-sm text-muted-foreground">Tied to one specific employee</p>
          </div>
          <div
            onClick={() => setType('company')}
            className={`flex-1 border p-4 rounded-xl cursor-pointer ${type === 'company' ? 'ring-2 ring-blue-500' : ''}`}
          >
            <h4 className="font-semibold mb-1">Company Document</h4>
            <p className="text-sm text-muted-foreground">Visible to all or specific departments</p>
          </div>
        </div>

        {/* Step 2: Conditional Fields */}
        {type === 'employee' && (
          <div>
            <Label>Select Employee</Label>
            <Select onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an employee" />
              </SelectTrigger>
              <SelectContent>
                {(await fetchEmployees()).map(emp => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {type === 'company' && (
          <div>
            <Label>Select Department</Label>
            <Select onValueChange={setDepartmentId}>
              <SelectTrigger>
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {(await fetchDepartments()).map(dep => (
                  <SelectItem key={dep.id} value={dep.id}>
                    {dep.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Shared Fields */}
        <div>
          <Label>Title</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div>
          <Label>Category</Label>
          <Select onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Description (optional)</Label>
          <Textarea value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        <div>
          <Label>Upload File</Label>
          <Input type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>

        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Uploading...' : 'Upload Document'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
