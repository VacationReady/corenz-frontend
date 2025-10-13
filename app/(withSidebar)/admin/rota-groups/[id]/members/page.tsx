'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, Users, Check, Search } from 'lucide-react';
import Link from 'next/link';

interface Employee {
  id: string;
  User: { name: string; email: string };
  Location?: { name: string };
  Department?: { name: string };
}

interface Member {
  id: string;
  employeeId: string;
  assignedRoles: string[];
  Employee: Employee;
}

interface RotaGroup {
  id: string;
  name: string;
  icon?: string;
  roles: string[];
}

export default function RotaGroupMembersPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [group, setGroup] = useState<RotaGroup | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({});

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      const [groupRes, membersRes, employeesRes] = await Promise.all([
        fetch(`/api/rota-groups/${groupId}`),
        fetch(`/api/rota-groups/${groupId}/members`),
        fetch('/api/employees'),
      ]);

      const groupData = await groupRes.json();
      const membersData = await membersRes.json();
      const employeesData = await employeesRes.json();

      setGroup(groupData.rotaGroup);
      setMembers(membersData.members || []);
      setAllEmployees(employeesData.employees || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const memberIds = new Set(members.map(m => m.employeeId));
  const availableEmployees = allEmployees.filter(e => !memberIds.has(e.id));

  const filteredEmployees = availableEmployees.filter(emp => 
    emp.User.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.User.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleEmployee = (employeeId: string) => {
    const newSelected = new Set(selectedEmployees);
    if (newSelected.has(employeeId)) {
      newSelected.delete(employeeId);
      const newRoles = { ...selectedRoles };
      delete newRoles[employeeId];
      setSelectedRoles(newRoles);
    } else {
      newSelected.add(employeeId);
      setSelectedRoles({
        ...selectedRoles,
        [employeeId]: group?.roles || [],
      });
    }
    setSelectedEmployees(newSelected);
  };

  const toggleRole = (employeeId: string, role: string) => {
    const currentRoles = selectedRoles[employeeId] || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    setSelectedRoles({
      ...selectedRoles,
      [employeeId]: newRoles,
    });
  };

  const addSelectedMembers = async () => {
    if (selectedEmployees.size === 0) return;

    try {
      const membersToAdd = Array.from(selectedEmployees).map(empId => ({
        employeeId: empId,
        assignedRoles: selectedRoles[empId] || [],
      }));

      const response = await fetch(`/api/rota-groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: membersToAdd }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to add members');
        return;
      }

      // Refresh data
      fetchData();
      setSelectedEmployees(new Set());
      setSelectedRoles({});
    } catch (error) {
      console.error('Error adding members:', error);
      alert('Failed to add members');
    }
  };

  const removeMember = async (employeeId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const response = await fetch(`/api/rota-groups/${groupId}/members/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to remove member');
        return;
      }

      setMembers(members.filter(m => m.employeeId !== employeeId));
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/rota-groups"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Rota Groups
        </Link>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{group?.icon || '📋'}</span>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">{group?.name}</h1>
        </div>
        <p className="text-muted-foreground">
          Manage members and their assigned roles
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Employees */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Available Employees</h2>
              <span className="text-gray-400 text-sm">{availableEmployees.length} available</span>
            </div>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employees..."
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {selectedEmployees.size > 0 && (
              <button
                onClick={addSelectedMembers}
                className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add {selectedEmployees.size} Selected
              </button>
            )}
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                {searchTerm ? 'No employees found' : 'All employees are already members'}
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {filteredEmployees.map((emp) => {
                  const isSelected = selectedEmployees.has(emp.id);
                  return (
                    <div key={emp.id} className="p-4">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleEmployee(emp.id)}
                          className="mt-1 w-5 h-5 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-white">{emp.User.name}</div>
                          <div className="text-sm text-gray-400">{emp.User.email}</div>
                          {(emp.Location || emp.Department) && (
                            <div className="text-xs text-gray-500 mt-1">
                              {emp.Location?.name} • {emp.Department?.name}
                            </div>
                          )}

                          {isSelected && group && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {group.roles.map((role) => {
                                const roleSelected = selectedRoles[emp.id]?.includes(role);
                                return (
                                  <button
                                    key={role}
                                    type="button"
                                    onClick={() => toggleRole(emp.id, role)}
                                    className={`px-2 py-1 text-xs rounded-full transition-all ${
                                      roleSelected
                                        ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                                        : 'bg-gray-700 text-gray-400 border border-gray-600'
                                    }`}
                                  >
                                    {roleSelected && <Check className="w-3 h-3 inline mr-1" />}
                                    {role}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Current Members */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Current Members</h2>
              <span className="text-gray-400 text-sm">{members.length} members</span>
            </div>
          </div>

          <div className="max-h-[600px] overflow-y-auto">
            {members.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No members yet</p>
                <p className="text-sm">Add employees from the left panel</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10">
                {members.map((member) => (
                  <div key={member.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="font-medium text-white">{member.Employee.User.name}</div>
                        <div className="text-sm text-gray-400">{member.Employee.User.email}</div>
                        {(member.Employee.Location || member.Employee.Department) && (
                          <div className="text-xs text-gray-500 mt-1">
                            {member.Employee.Location?.name} • {member.Employee.Department?.name}
                          </div>
                        )}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {member.assignedRoles.map((role) => (
                            <span
                              key={role}
                              className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => removeMember(member.employeeId)}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
                        title="Remove member"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex gap-4">
        <Link
          href="/admin/rota-groups"
          className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
        >
          Done
        </Link>
        <Link
          href={`/rota?groupId=${groupId}`}
          className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all"
        >
          View Rota
        </Link>
      </div>
    </div>
  );
}
