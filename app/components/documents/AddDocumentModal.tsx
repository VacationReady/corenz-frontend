'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Switch } from '@/components/ui/switch';
import { useSession } from 'next-auth/react';
import { fetchEmployees, fetchDepartments } from '@/lib/fetchData';
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
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);

  // ✅ Access control state
  const [canViewAdmin, setCanViewAdmin] = useState(true);
  const [canViewManager, setCanViewManager] = useState(false);
  const [canViewEmployee, setCanViewEmployee] = useState(true);

  const user = session?.user;

  useEffect(() => {
    const loadData = async () => {
      try {
        const [emp, dep] = await Promise.all([fetchEmployees(), fetchDepartments()]);
        setEmployees(emp);
        setDepartments(dep);
      } catch (err) {
        console.error('Failed to fetch employees or departments', err);
      }
    };
    if (open) loadData();
  }, [open]);

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
      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', title);
      formData.append('category', category || '');
      formData.append('description', description || '');
      formData.append('employeeId', type === 'employee' ? employeeId : '');
      formData.append('departmentId', type === 'company' && departmentId !== 'all' ? departmentId : '');
      formData.append('type', type || '');

      // ✅ Include access rights
      formData.append('canViewAdmin', String(canViewAdmin));
      formData.append('canViewManager', String(canViewManager));
      formData.append('canViewEmployee', String(canViewEmployee));

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error || 'API call failed');
      }

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
                {employees.map(emp => (
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
                {departments.map(dep => (
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

        {/* ✅ Access Rights */}
        {type === 'employee' && (
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Admin Access</Label>
              <Switch
                checked={canViewAdmin}
                onChange={(e) => setCanViewAdmin((e.target as HTMLInputElement).checked)}
              />
            </div>
            <div>
              <Label>Manager Access</Label>
              <Switch
                checked={canViewManager}
                onChange={(e) => setCanViewManager((e.target as HTMLInputElement).checked)}
              />
            </div>
            <div>
              <Label>Employee Access</Label>
              <Switch
                checked={canViewEmployee}
                onChange={(e) => setCanViewEmployee((e.target as HTMLInputElement).checked)}
              />
            </div>
          </div>
        )}

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
