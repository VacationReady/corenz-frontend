'use client';

import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { toast } from 'sonner';
import Link from 'next/link';
import { PageShell } from '@/components/ui/PageShell';

export default function ArchivedWorkingPatternsPage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const breadcrumbs = {
    items: [
      { label: 'Settings', href: '/settings' },
      { label: 'Working Patterns', href: '/settings/working-patterns' },
      { label: 'Archived', isCurrentPage: true },
    ],
  };

  const fetchArchivedPatterns = async () => {
    const res = await fetch('/api/working-patterns?archived=true');
    const data = await res.json();
    setPatterns(data);
  };

  useEffect(() => {
    fetchArchivedPatterns();
  }, []);

  const handleRestore = async (id: string) => {
    const res = await fetch(`/api/working-patterns/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: true }),
    });
    if (res.ok) {
      toast.success('Pattern restored');
      fetchArchivedPatterns();
    } else {
      toast.error('Error restoring pattern');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this pattern? This cannot be undone.')) return;

    const res = await fetch(`/api/working-patterns/${id}?permanent=true`, { method: 'DELETE' });
    if (res.ok) {
      toast.success('Pattern permanently deleted');
      fetchArchivedPatterns();
    } else {
      toast.error('Error deleting pattern');
    }
  };

  return (
    <PageShell title="Archived Working Patterns" breadcrumbs={breadcrumbs} showHomeIcon={false}>
      <div className="flex justify-end mb-4">
        <Link href="/settings/working-patterns">
          <Button variant="ghost">Back to Patterns</Button>
        </Link>
      </div>

      {patterns.length === 0 ? (
        <p className="text-gray-600">No archived patterns found.</p>
      ) : (
        <div className="grid gap-4">
          {patterns.map((pattern) => (
            <Card key={pattern.id} className="p-4 flex justify-between items-center">
              <div>
                <h2 className="font-semibold">{pattern.name}</h2>
                <p className="text-sm text-gray-600">{pattern.description || 'No description'}</p>
                <p className="text-sm">
                  Days: {pattern.weeks && pattern.weeks.length > 0
                    ? pattern.weeks
                        .flatMap((week: any) => week.days || [])
                        .map((d: any) => `${d.day} (${d.type.replace(/_/g, ' ')})`)
                        .join(', ')
                    : 'None'}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button variant="ghost" onClick={() => handleRestore(pattern.id)}>Restore</Button>
                <Button variant="danger" onClick={() => handleDelete(pattern.id)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}
