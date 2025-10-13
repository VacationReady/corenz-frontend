'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, X, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface RotaGroup {
  id: string;
  name: string;
  icon?: string;
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-screen max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/admin/rota-groups/${groupId}/members`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Members
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{group?.icon || '📋'}</span>
          <h1 className="text-3xl font-bold text-white">{group?.name}</h1>
        </div>
        <p className="text-gray-400">
          Define how many staff you need for each role, day, and time
        </p>
      </div>

      {/* Add New Requirement Form */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold text-white mb-4">Add Staffing Requirement</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Day</label>
            <select
              value={newReq.dayOfWeek}
              onChange={(e) => setNewReq({ ...newReq, dayOfWeek: parseInt(e.target.value) })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DAYS.map((day, idx) => (
                <option key={idx} value={idx} className="bg-gray-800 text-white">{day}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
            <input
              type="time"
              value={newReq.startTime}
              onChange={(e) => setNewReq({ ...newReq, startTime: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
            <input
              type="time"
              value={newReq.endTime}
              onChange={(e) => setNewReq({ ...newReq, endTime: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Break (min)</label>
            <input
              type="number"
              value={newReq.breakDuration}
              onChange={(e) => setNewReq({ ...newReq, breakDuration: parseInt(e.target.value) })}
              min="0"
              step="15"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Role</label>
            <select
              value={newReq.role}
              onChange={(e) => setNewReq({ ...newReq, role: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {group?.roles.map((role) => (
                <option key={role} value={role} className="bg-gray-800 text-white">{role}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Quantity Needed</label>
            <input
              type="number"
              value={newReq.quantity}
              onChange={(e) => setNewReq({ ...newReq, quantity: parseInt(e.target.value) })}
              min="1"
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
            <select
              value={newReq.priority}
              onChange={(e) => setNewReq({ ...newReq, priority: e.target.value })}
              className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p} className="bg-gray-800 text-white">{p}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={addRequirement}
          disabled={saving || !newReq.role}
          className="mt-4 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {saving ? 'Adding...' : 'Add Requirement'}
        </button>
      </div>

      {/* Requirements by Day */}
      <div className="space-y-4">
        {requirementsByDay.map(({ day, dayIndex, requirements: dayReqs }) => (
          <div key={dayIndex} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
            <div className="bg-white/5 border-b border-white/10 p-4">
              <h3 className="text-lg font-semibold text-white">{day}</h3>
            </div>
            
            {dayReqs.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No staffing requirements for {day}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {dayReqs.map((req) => (
                  <div key={req.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-white font-medium min-w-[120px]">
                        {req.startTime} - {req.endTime}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-sm rounded-full border border-blue-500/30">
                          {req.role}
                        </span>
                        <span className="text-gray-300 text-sm">
                          Need: <span className="font-bold">{req.quantity}</span>
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          req.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                          req.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' :
                          req.priority === 'NORMAL' ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                          'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                        }`}>
                          {req.priority}
                        </span>
                        {req.breakDuration > 0 && (
                          <span className="text-gray-400 text-xs">
                            {req.breakDuration}min break
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteRequirement(req.id)}
                      className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                      title="Delete requirement"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="mt-6 flex gap-4">
        <Link
          href={`/admin/rota-groups/${groupId}/members`}
          className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
        >
          Back to Members
        </Link>
        <Link
          href={`/rota/coverage?groupId=${groupId}`}
          className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
        >
          View Coverage Analysis
        </Link>
      </div>
    </div>
  );
}
