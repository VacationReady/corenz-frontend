'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import EditRotaGroupModal from '@/components/rota/EditRotaGroupModal';

interface RotaGroup {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  roles: string[];
  requiredSkills?: string[];
  optionalTags?: string[];
  locationId?: string | null;
  departmentId?: string | null;
  Location?: { id: string; name: string };
  Department?: { id: string; name: string };
  Members?: any[];
  _count: {
    Members: number;
    Shifts: number;
    ShiftRequirements: number;
  };
}

export default function EditRotaGroupPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<RotaGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) return;

    const fetchGroup = async () => {
      try {
        const res = await fetch(`/api/rota-groups/${groupId}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error || 'Failed to load rota group');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setGroup(data.rotaGroup);
      } catch (err) {
        console.error('Error loading rota group:', err);
        setError('Failed to load rota group');
      } finally {
        setLoading(false);
      }
    };

    fetchGroup();
  }, [groupId]);

  const handleClose = () => {
    router.push('/admin/rota-groups');
  };

  const handleSuccess = () => {
    router.push('/admin/rota-groups');
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-content-panel p-8 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading rota group...</p>
        </motion.div>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="w-full min-h-screen bg-content-panel p-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-card border border-border rounded-xl p-6 text-center space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Rota group not found</h1>
          <p className="text-sm text-muted-foreground">
            {error || 'We could not find this rota group. It may have been deleted or you may have followed an invalid link.'}
          </p>
          <button
            onClick={() => router.push('/admin/rota-groups')}
            className="mt-2 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            Back to Rota Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-content-panel">
      <EditRotaGroupModal
        isOpen={true}
        group={group}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}
