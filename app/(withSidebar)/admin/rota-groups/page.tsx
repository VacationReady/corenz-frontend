'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Building2, 
  Users, 
  Calendar, 
  Settings, 
  Trash2, 
  Info,
  MapPin,
  Briefcase,
  Eye,
  Search,
  LayoutGrid
} from 'lucide-react';
import { getRotaGroupIcon } from '@/lib/rota-group-icons';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
  const [searchTerm, setSearchTerm] = useState('');
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

  // Filter groups based on search
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.Location?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.Department?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-content-panel p-8 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading rota groups...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-content-panel">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <LayoutGrid className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Rota Groups</h1>
                <p className="text-muted-foreground">
                  Manage scheduling pools and shift teams
                </p>
              </div>
            </div>
            <Link href="/admin/rota-groups/create">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all">
                <Plus className="w-5 h-5 mr-2" />
                Create Group
              </Button>
            </Link>
          </div>

          {/* Search Bar */}
          {groups.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-6"
            >
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search groups..."
                  className="pl-10 h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                />
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Empty State */}
        <AnimatePresence>
          {groups.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-16 px-4"
            >
              <div className="p-6 rounded-full bg-blue-500/10 mb-6">
                <Users className="w-16 h-16 text-blue-500" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">No Rota Groups Yet</h2>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Create your first rota group to organize employees by location, department, and roles for better shift management.
              </p>
              <Link href="/admin/rota-groups/create">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Your First Group
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Groups Grid */}
        {filteredGroups.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filteredGroups.map((group, index) => (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -2 }}
                className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
              >
                {/* Color Bar */}
                <div 
                  className="h-1.5"
                  style={{ backgroundColor: group.color || '#3B82F6' }}
                />
                
                <div className="p-5">
                  {/* Header with Icon */}
                  <div className="flex items-start gap-3 mb-4">
                    <div
                      className="p-2.5 rounded-xl flex-shrink-0"
                      style={{
                        backgroundColor: group.color ? `${group.color}15` : 'rgba(59, 130, 246, 0.1)',
                      }}
                    >
                      {(() => {
                        const IconComponent = getRotaGroupIcon(group.icon);
                        return <IconComponent className="w-7 h-7" style={{ color: group.color || '#3B82F6' }} />;
                      })()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-card-foreground mb-0.5 truncate">
                        {group.name}
                      </h3>
                      {group.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Location/Department */}
                  {(group.Location || group.Department) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                      <MapPin className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <span className="truncate">
                        {group.Location?.name || group.Department?.name}
                      </span>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm mb-4">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Users className="w-4 h-4 text-emerald-500" />
                      <span className="font-medium text-foreground">{group._count.Members}</span>
                      <span>members</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="w-4 h-4 text-violet-500" />
                      <span className="font-medium text-foreground">{group._count.Shifts}</span>
                      <span>shifts</span>
                    </div>
                  </div>

                  {/* Roles */}
                  {group.roles && group.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {group.roles.slice(0, 3).map((role, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded-full border border-blue-500/20 font-medium"
                        >
                          <Briefcase className="w-3 h-3" />
                          {role}
                        </span>
                      ))}
                      {group.roles.length > 3 && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full border border-border">
                          +{group.roles.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t border-border">
                    <Link
                      href={`/rota?groupId=${group.id}`}
                      className="flex-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium text-center transition-all flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      View Rota
                    </Link>
                    <Link
                      href={`/admin/rota-groups/${group.id}/members`}
                      className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all"
                      title="Manage Members"
                    >
                      <Users className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/admin/rota-groups/${group.id}/edit`}
                      className="px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-all"
                      title="Edit Group"
                    >
                      <Settings className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* No search results */}
        {groups.length > 0 && filteredGroups.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16"
          >
            <Search className="w-12 h-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No groups match your search</p>
          </motion.div>
        )}

        {/* Info Box */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 flex-shrink-0">
              <Info className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h4 className="text-foreground font-medium mb-1">What are Rota Groups?</h4>
              <p className="text-sm text-muted-foreground">
                Rota Groups are scheduling pools that organise employees by location, department, and roles. 
                They make shift scheduling faster by filtering the right employees for each shift, 
                enforcing skill requirements, and providing coverage insights.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
