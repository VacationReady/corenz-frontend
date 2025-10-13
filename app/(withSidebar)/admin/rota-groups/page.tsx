'use client';

import { useState, useEffect } from 'react';
import { Plus, Building2, Users, Calendar, Settings, Trash2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface RotaGroup {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  roles: string[];
  Location?: { id: string; name: string };
  Department?: { id: string; name: string };
  _count: {
    Members: number;
    Shifts: number;
    ShiftRequirements: number;
  };
}

export default function RotaGroupsPage() {
  const [groups, setGroups] = useState<RotaGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('/api/rota-groups');
      const data = await response.json();
      setGroups(data.rotaGroups || []);
    } catch (error) {
      console.error('Error fetching rota groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rota group? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/rota-groups/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to delete rota group');
        return;
      }

      setGroups(groups.filter(g => g.id !== id));
    } catch (error) {
      console.error('Error deleting rota group:', error);
      alert('Failed to delete rota group');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-white text-lg">Loading rota groups...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Rota Groups</h1>
          <p className="text-muted-foreground">
            Manage scheduling pools and shift teams for workforce management
          </p>
        </div>
        <Link
          href="/admin/rota-groups/create"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all flex items-center gap-2 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5" />
          Create Group
        </Link>
      </div>

      {/* Empty State */}
      {groups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-4">
          <div className="text-6xl mb-4">🏭</div>
          <h2 className="text-2xl font-bold text-white mb-2">No Rota Groups Yet</h2>
          <p className="text-gray-400 text-center max-w-md mb-6">
            Create your first rota group to organize employees by location, department, and roles for better shift management.
          </p>
          <Link
            href="/admin/rota-groups/create"
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Your First Group
          </Link>
        </div>
      )}

      {/* Groups Grid */}
      {groups.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div
              key={group.id}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden hover:bg-white/10 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <div className="p-6">
                {/* Header with Icon */}
                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="text-4xl p-3 rounded-lg flex-shrink-0"
                    style={{
                      backgroundColor: group.color ? `${group.color}20` : 'rgba(59, 130, 246, 0.2)',
                    }}
                  >
                    {group.icon || '📋'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white mb-1 truncate">
                      {group.name}
                    </h3>
                    {group.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {group.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Location/Department */}
                {(group.Location || group.Department) && (
                  <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                    <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="truncate">
                      {group.Location?.name || group.Department?.name}
                    </span>
                  </div>
                )}

                {/* Members Count */}
                <div className="flex items-center gap-2 text-sm text-gray-300 mb-4">
                  <Users className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>
                    {group._count.Members} {group._count.Members === 1 ? 'employee' : 'employees'}
                  </span>
                  <span className="text-gray-600">•</span>
                  <Calendar className="w-4 h-4 text-purple-400 flex-shrink-0" />
                  <span>
                    {group._count.Shifts} {group._count.Shifts === 1 ? 'shift' : 'shifts'}
                  </span>
                </div>

                {/* Roles */}
                {group.roles && group.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {group.roles.slice(0, 3).map((role, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30"
                      >
                        {role}
                      </span>
                    ))}
                    {group.roles.length > 3 && (
                      <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full border border-gray-500/30">
                        +{group.roles.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t border-white/10">
                  <Link
                    href={`/rota?groupId=${group.id}`}
                    className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium text-center transition-all"
                  >
                    View Rota
                  </Link>
                  <Link
                    href={`/admin/rota-groups/${group.id}/edit`}
                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                    title="Edit Group"
                  >
                    <Settings className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(group.id)}
                    className="px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                    title="Delete Group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-white font-medium mb-1">What are Rota Groups?</h4>
            <p className="text-sm text-gray-300">
              Rota Groups are scheduling pools that organize employees by location, department, and roles. 
              They make shift scheduling faster by filtering the right employees for each shift, 
              enforcing skill requirements, and providing coverage insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
