'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/Table';
import Button from '@/components/ui/Button';

interface TrainingRecord {
  id: string;
  dateCompleted: string;
  expiryDate: string | null;
  document: {
    id: string;
    name: string;
    url: string;
  } | null;
  course: {
    id: string;
    name: string;
  } | null;
  provider: {
    id: string;
    name: string;
  } | null;
}

export default function Training({ employeeId }: { employeeId: string }) {
  const router = useRouter();
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      const res = await fetch(`/api/training-records/list?employeeId=${employeeId}`);
      const data = await res.json();
      setRecords(data);
      setLoading(false);
    };

    if (employeeId) fetchRecords();
  }, [employeeId]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Training Records</h1>
        <Button onClick={() => router.push(`/employees/${employeeId}/training/add`)}>
          Add Training
        </Button>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : records.length === 0 ? (
        <p>No training records found for this employee.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Course Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Date Completed</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Document</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow
                key={record.id}
                onClick={() => router.push(`/employees/${employeeId}/training/${record.id}`)}
                className="cursor-pointer hover:bg-muted transition"
              >
                <TableCell>{record.course?.name ?? '—'}</TableCell>
                <TableCell>{record.provider?.name ?? '—'}</TableCell>
                <TableCell>{new Date(record.dateCompleted).toLocaleDateString()}</TableCell>
                <TableCell>
                  {record.expiryDate ? new Date(record.expiryDate).toLocaleDateString() : '—'}
                </TableCell>
                <TableCell>
                  {record.document ? (
                    <a
                      href={record.document.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {record.document.name}
                    </a>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
