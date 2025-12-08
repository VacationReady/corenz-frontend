'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Clock, 
  Users, 
  Briefcase,
  Calendar,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import Button from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';

interface RotaGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  roles: string[];
}

interface Requirement {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  role: string;
  quantity: number;
  priority: string;
  breakDuration: number;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PRIORITIES = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW'];

const priorityConfig = {
  CRITICAL: { color: 'red', label: 'Critical' },
  HIGH: { color: 'orange', label: 'High' },
  NORMAL: { color: 'emerald', label: 'Normal' },
  LOW: { color: 'slate', label: 'Low' },
};

export default function StaffingRequirementsPage() {
  const params = useParams();
  const groupId = params.id as string;

  const [group, setGroup] = useState<RotaGroup | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newReq, setNewReq] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    role: '',
    quantity: 1,
    priority: 'NORMAL',
    breakDuration: 30,
  });

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      const [groupRes, reqRes] = await Promise.all([
        fetch(`/api/rota-groups/${groupId}`),
        fetch(`/api/rota-groups/${groupId}/requirements`),
      ]);

      const groupData = await groupRes.json();
      const reqData = await reqRes.json();

      setGroup(groupData.rotaGroup);
      setRequirements(reqData.requirements || []);

      if (groupData.rotaGroup.roles.length > 0) {
        setNewReq({ ...newReq, role: groupData.rotaGroup.roles[0] });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addRequirement = async () => {
    if (!newReq.role) {
      alert('Please select a role');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/rota-groups/${groupId}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReq),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to add requirement');
        return;
      }

      fetchData();
    } catch (error) {
      console.error('Error adding requirement:', error);
      alert('Failed to add requirement');
    } finally {
      setSaving(false);
    }
  };

  const deleteRequirement = async (id: string) => {
    if (!confirm('Delete this staffing requirement?')) return;

    try {
      const response = await fetch(`/api/rota-groups/${groupId}/requirements/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        alert('Failed to delete requirement');
        return;
      }

      setRequirements(requirements.filter(r => r.id !== id));
    } catch (error) {
      console.error('Error deleting requirement:', error);
      alert('Failed to delete requirement');
    }
  };

  // Group requirements by day
  const requirementsByDay = DAYS.map((day, dayIndex) => ({
    day,
    dayIndex,
    requirements: requirements.filter(r => r.dayOfWeek === dayIndex),
  }));

  // Track expanded days
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5])); // Mon-Fri expanded by default

  const toggleDay = (dayIndex: number) => {
    const newExpanded = new Set(expandedDays);
    if (newExpanded.has(dayIndex)) {
      newExpanded.delete(dayIndex);
    } else {
      newExpanded.add(dayIndex);
    }
    setExpandedDays(newExpanded);
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
          <p className="text-muted-foreground">Loading requirements...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-content-panel">
      <div className="container mx-auto p-6 max-w-5xl">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link
            href="/admin/rota-groups"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Rota Groups
          </Link>
          <div className="flex items-center gap-4">
            <div 
              className="text-3xl p-3 rounded-xl"
              style={{ backgroundColor: group?.color ? `${group.color}15` : 'rgba(59, 130, 246, 0.1)' }}
            >
              {group?.icon || '📋'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{group?.name}</h1>
              <p className="text-muted-foreground">
                Define staffing requirements for each day and time
              </p>
            </div>
          </div>
        </motion.div>

        {/* Add New Requirement Form */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6"
        >
          <div className="p-4 border-b border-border bg-muted/30 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-foreground">Add Staffing Requirement</h2>
          </div>
          
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Day
                </Label>
                <Select
                  value={newReq.dayOfWeek.toString()}
                  onValueChange={(value) => setNewReq({ ...newReq, dayOfWeek: parseInt(value) })}
                >
                  <SelectTrigger className="h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day, idx) => (
                      <SelectItem key={idx} value={idx.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Start Time
                </Label>
                <Input
                  type="time"
                  value={newReq.startTime}
                  onChange={(e) => setNewReq({ ...newReq, startTime: e.target.value })}
                  className="h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  End Time
                </Label>
                <Input
                  type="time"
                  value={newReq.endTime}
                  onChange={(e) => setNewReq({ ...newReq, endTime: e.target.value })}
                  className="h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Break (min)</Label>
                <Input
                  type="number"
                  value={newReq.breakDuration}
                  onChange={(e) => setNewReq({ ...newReq, breakDuration: parseInt(e.target.value) })}
                  min="0"
                  step="15"
                  className="h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  Role
                </Label>
                <Select
                  value={newReq.role}
                  onValueChange={(value) => setNewReq({ ...newReq, role: value })}
                >
                  <SelectTrigger className="h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {group?.roles.map((role) => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  Quantity Needed
                </Label>
                <Input
                  type="number"
                  value={newReq.quantity}
                  onChange={(e) => setNewReq({ ...newReq, quantity: parseInt(e.target.value) })}
                  min="1"
                  className="h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  Priority
                </Label>
                <Select
                  value={newReq.priority}
                  onValueChange={(value) => setNewReq({ ...newReq, priority: value })}
                >
                  <SelectTrigger className="h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {priorityConfig[p as keyof typeof priorityConfig].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={addRequirement}
              disabled={saving || !newReq.role}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-5 h-5 mr-2" />
              {saving ? 'Adding...' : 'Add Requirement'}
            </Button>
          </div>
        </motion.div>

        {/* Requirements by Day */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {requirementsByDay.map(({ day, dayIndex, requirements: dayReqs }) => (
            <div 
              key={dayIndex} 
              className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
            >
              <button
                onClick={() => toggleDay(dayIndex)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Calendar className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{day}</h3>
                  {dayReqs.length > 0 && (
                    <span className="text-sm text-muted-foreground px-2 py-0.5 bg-muted rounded-full">
                      {dayReqs.length} {dayReqs.length === 1 ? 'requirement' : 'requirements'}
                    </span>
                  )}
                </div>
                <motion.div
                  animate={{ rotate: expandedDays.has(dayIndex) ? 90 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </motion.div>
              </button>
              
              <AnimatePresence>
                {expandedDays.has(dayIndex) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {dayReqs.length === 0 ? (
                      <div className="p-6 text-center border-t border-border">
                        <Clock className="w-10 h-10 mx-auto mb-2 text-muted-foreground/50" />
                        <p className="text-muted-foreground">No staffing requirements for {day}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border border-t border-border">
                        {dayReqs.map((req, index) => (
                          <motion.div 
                            key={req.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-4 flex-1 flex-wrap">
                              <div className="flex items-center gap-2 text-foreground font-medium min-w-[120px]">
                                <Clock className="w-4 h-4 text-blue-500" />
                                {req.startTime} - {req.endTime}
                              </div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-sm rounded-full border border-blue-500/20 font-medium">
                                <Briefcase className="w-3.5 h-3.5" />
                                {req.role}
                              </span>
                              <span className="flex items-center gap-1.5 text-muted-foreground text-sm">
                                <Users className="w-4 h-4 text-emerald-500" />
                                <span className="font-semibold text-foreground">{req.quantity}</span> needed
                              </span>
                              <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
                                req.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                req.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                                req.priority === 'NORMAL' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                              }`}>
                                {priorityConfig[req.priority as keyof typeof priorityConfig]?.label || req.priority}
                              </span>
                              {req.breakDuration > 0 && (
                                <span className="text-muted-foreground text-xs">
                                  {req.breakDuration}min break
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => deleteRequirement(req.id)}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-all"
                              title="Delete requirement"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex gap-3"
        >
          <Link href={`/admin/rota-groups/${groupId}/members`}>
            <Button variant="outline" className="border-border">
              <Users className="w-5 h-5 mr-2" />
              Back to Members
            </Button>
          </Link>
          <Link href={`/rota/coverage?groupId=${groupId}`}>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
              <BarChart3 className="w-5 h-5 mr-2" />
              View Coverage Analysis
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
