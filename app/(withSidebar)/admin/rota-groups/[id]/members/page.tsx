'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Users, 
  Check, 
  Search,
  UserPlus,
  Briefcase,
  MapPin,
  Building2,
  Eye,
  Pencil,
  Award,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import Button from '@/components/ui/Button';

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
  assignedSkills: string[];
  Employee: Employee;
}

interface RotaGroup {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  roles: string[];
  requiredSkills: string[];
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
  const [selectedSkills, setSelectedSkills] = useState<Record<string, string[]>>({});
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [groupId]);

  const fetchData = async () => {
    try {
      const [groupRes, membersRes, employeesRes] = await Promise.all([
        fetch(`/api/rota-groups/${groupId}`),
        fetch(`/api/rota-groups/${groupId}/members`),
        fetch('/api/employees?status=active&limit=all'),
      ]);

      const groupData = await groupRes.json();
      const membersData = await membersRes.json();
      const employeesData = await employeesRes.json();

      setGroup(groupData.rotaGroup);
      setMembers(membersData.members || []);
      const rawEmployees = (employeesData.employees || employeesData.data || []) as any[];

      const normalizedEmployees: Employee[] = rawEmployees.map((emp: any) => {
        // If the shape already matches the Employee interface (with nested User/Location/Department), preserve it
        if (emp.User) {
          return {
            id: emp.id,
            User: {
              name:
                emp.User.name ||
                [emp.User.firstName, emp.User.lastName].filter(Boolean).join(' ') ||
                emp.User.email,
              email: emp.User.email,
            },
            Location: emp.Location
              ? { name: emp.Location.name }
              : emp.locationName
              ? { name: emp.locationName }
              : undefined,
            Department: emp.Department
              ? { name: emp.Department.name }
              : emp.departmentName
              ? { name: emp.departmentName }
              : undefined,
          };
        }

        // Map flattened /api/employees shape into the structure expected by the UI
        return {
          id: emp.id,
          User: {
            name: [emp.firstName, emp.lastName].filter(Boolean).join(' ') || emp.email,
            email: emp.email,
          },
          Location: emp.locationName ? { name: emp.locationName } : undefined,
          Department: emp.departmentName ? { name: emp.departmentName } : undefined,
        };
      });

      setAllEmployees(normalizedEmployees);
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
      const newSkills = { ...selectedSkills };
      delete newSkills[employeeId];
      setSelectedSkills(newSkills);
    } else {
      newSelected.add(employeeId);
      setSelectedRoles({
        ...selectedRoles,
        [employeeId]: group?.roles || [],
      });
      setSelectedSkills({
        ...selectedSkills,
        [employeeId]: group?.requiredSkills || [],
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

  const toggleSkill = (employeeId: string, skill: string) => {
    const currentSkills = selectedSkills[employeeId] || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter(s => s !== skill)
      : [...currentSkills, skill];
    
    setSelectedSkills({
      ...selectedSkills,
      [employeeId]: newSkills,
    });
  };

  const addSelectedMembers = async () => {
    if (selectedEmployees.size === 0) return;

    try {
      const membersToAdd = Array.from(selectedEmployees).map(empId => ({
        employeeId: empId,
        assignedRoles: selectedRoles[empId] || [],
        assignedSkills: selectedSkills[empId] || [],
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
      setSelectedSkills({});
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

  const startEditingMember = (member: Member) => {
    setEditingMemberId(member.employeeId);
  };

  const cancelEditingMember = () => {
    setEditingMemberId(null);
    // Refresh to reset any unsaved changes
    fetchData();
  };

  const toggleMemberRole = (member: Member, role: string) => {
    const currentRoles = member.assignedRoles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    
    setMembers(members.map((m) => 
      m.employeeId === member.employeeId 
        ? { ...m, assignedRoles: newRoles }
        : m
    ));
  };

  const toggleMemberSkill = (member: Member, skill: string) => {
    const currentSkills = member.assignedSkills || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter((s) => s !== skill)
      : [...currentSkills, skill];
    
    setMembers(members.map((m) => 
      m.employeeId === member.employeeId 
        ? { ...m, assignedSkills: newSkills }
        : m
    ));
  };

  const saveMemberChanges = async (member: Member) => {
    setSavingMemberId(member.employeeId);
    try {
      const response = await fetch(`/api/rota-groups/${groupId}/members/${member.employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedRoles: member.assignedRoles,
          assignedSkills: member.assignedSkills,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to update member');
        fetchData();
        return;
      }

      setEditingMemberId(null);
    } catch (error) {
      console.error('Error updating member:', error);
      alert('Failed to update member');
      fetchData();
    } finally {
      setSavingMemberId(null);
    }
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
          <p className="text-muted-foreground">Loading members...</p>
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
                Manage members and their assigned roles
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Available Employees */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
          >
            <div className="p-5 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-foreground">Available Employees</h2>
                </div>
                <span className="text-sm text-muted-foreground px-2 py-1 bg-muted rounded-full">
                  {availableEmployees.length} available
                </span>
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search employees..."
                  className="pl-10 h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                />
              </div>

              <AnimatePresence>
                {selectedEmployees.size > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <Button
                      onClick={addSelectedMembers}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add {selectedEmployees.size} Selected
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {filteredEmployees.length === 0 ? (
                <div className="p-8 text-center">
                  <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No employees found' : 'All employees are already members'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredEmployees.map((emp) => {
                    const isSelected = selectedEmployees.has(emp.id);
                    return (
                      <motion.div 
                        key={emp.id} 
                        className={`p-4 transition-colors ${isSelected ? 'bg-blue-500/5' : 'hover:bg-muted/50'}`}
                        whileHover={{ x: 2 }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleEmployee(emp.id)}
                              className="w-5 h-5 rounded border-border bg-background text-blue-600 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{emp.User.name}</div>
                            <div className="text-sm text-muted-foreground">{emp.User.email}</div>
                            {(emp.Location || emp.Department) && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                {emp.Location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {emp.Location.name}
                                  </span>
                                )}
                                {emp.Department && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {emp.Department.name}
                                  </span>
                                )}
                              </div>
                            )}

                            <AnimatePresence>
                              {isSelected && group && (
                                <motion.div 
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="mt-3 space-y-2"
                                >
                                  {group.roles.length > 0 && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                        <Briefcase className="w-3 h-3" /> Roles:
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {group.roles.map((role) => {
                                          const roleSelected = selectedRoles[emp.id]?.includes(role);
                                          return (
                                            <button
                                              key={role}
                                              type="button"
                                              onClick={() => toggleRole(emp.id, role)}
                                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full transition-all font-medium ${
                                                roleSelected
                                                  ? 'bg-blue-500 text-white border border-blue-500'
                                                  : 'bg-muted text-muted-foreground border border-border hover:border-blue-500/30'
                                              }`}
                                            >
                                              {roleSelected && <Check className="w-3 h-3" />}
                                              {role}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                  {(group.requiredSkills || []).length > 0 && (
                                    <div>
                                      <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                        <Award className="w-3 h-3" /> Skills:
                                      </p>
                                      <div className="flex flex-wrap gap-1.5">
                                        {group.requiredSkills.map((skill) => {
                                          const skillSelected = selectedSkills[emp.id]?.includes(skill);
                                          return (
                                            <button
                                              key={skill}
                                              type="button"
                                              onClick={() => toggleSkill(emp.id, skill)}
                                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full transition-all font-medium ${
                                                skillSelected
                                                  ? 'bg-emerald-500 text-white border border-emerald-500'
                                                  : 'bg-muted text-muted-foreground border border-border hover:border-emerald-500/30'
                                              }`}
                                            >
                                              {skillSelected && <Check className="w-3 h-3" />}
                                              {skill}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Current Members */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
          >
            <div className="p-5 border-b border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <h2 className="text-lg font-semibold text-foreground">Current Members</h2>
                </div>
                <span className="text-sm text-muted-foreground px-2 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full font-medium">
                  {members.length} members
                </span>
              </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto">
              {members.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="p-4 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                    <Users className="w-12 h-12 text-muted-foreground/50" />
                  </div>
                  <p className="text-foreground font-medium mb-1">No members yet</p>
                  <p className="text-sm text-muted-foreground">Add employees from the left panel</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {members.map((member, index) => {
                    const isEditing = editingMemberId === member.employeeId;
                    const isSaving = savingMemberId === member.employeeId;
                    
                    return (
                      <motion.div 
                        key={member.id} 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className={`p-4 transition-colors ${
                          isEditing 
                            ? 'bg-blue-500/5 border-l-2 border-l-blue-500' 
                            : 'hover:bg-muted/30'
                        }`}
                      >
                        {/* Member Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground">{member.Employee.User.name}</div>
                            <div className="text-sm text-muted-foreground">{member.Employee.User.email}</div>
                            {(member.Employee.Location || member.Employee.Department) && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                {member.Employee.Location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {member.Employee.Location.name}
                                  </span>
                                )}
                                {member.Employee.Department && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="w-3 h-3" />
                                    {member.Employee.Department.name}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => cancelEditingMember()}
                                  disabled={isSaving}
                                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => saveMemberChanges(member)}
                                  disabled={isSaving}
                                  className="p-2 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition-all"
                                  title="Save changes"
                                >
                                  {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Check className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditingMember(member)}
                                  className="p-2 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all"
                                  title="Edit roles & skills"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removeMember(member.employeeId)}
                                  className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all"
                                  title="Remove member"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Roles Section */}
                        <div className="mb-3">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs font-medium text-muted-foreground">Roles</span>
                          </div>
                          {isEditing && group ? (
                            <div className="flex flex-wrap gap-1.5">
                              {group.roles.map((role) => {
                                const isAssigned = (member.assignedRoles || []).includes(role);
                                return (
                                  <button
                                    key={role}
                                    type="button"
                                    onClick={() => toggleMemberRole(member, role)}
                                    className={`px-2.5 py-1 text-xs rounded-full border transition-all font-medium ${
                                      isAssigned
                                        ? 'bg-blue-500 text-white border-blue-500'
                                        : 'bg-muted text-muted-foreground border-border hover:border-blue-500/50'
                                    }`}
                                  >
                                    {isAssigned && <Check className="w-3 h-3 inline mr-1" />}
                                    {role}
                                  </button>
                                );
                              })}
                              {group.roles.length === 0 && (
                                <span className="text-xs text-muted-foreground italic">No roles defined for this group</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {(member.assignedRoles || []).length > 0 ? (
                                member.assignedRoles.map((role) => (
                                  <span
                                    key={role}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs rounded-full border border-blue-500/20 font-medium"
                                  >
                                    {role}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No roles assigned</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Skills Section */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <Award className="w-3.5 h-3.5 text-emerald-500" />
                            <span className="text-xs font-medium text-muted-foreground">Skills</span>
                          </div>
                          {isEditing && group ? (
                            <div className="flex flex-wrap gap-1.5">
                              {(group.requiredSkills || []).map((skill) => {
                                const hasSkill = (member.assignedSkills || []).includes(skill);
                                return (
                                  <button
                                    key={skill}
                                    type="button"
                                    onClick={() => toggleMemberSkill(member, skill)}
                                    className={`px-2.5 py-1 text-xs rounded-full border transition-all font-medium ${
                                      hasSkill
                                        ? 'bg-emerald-500 text-white border-emerald-500'
                                        : 'bg-muted text-muted-foreground border-border hover:border-emerald-500/50'
                                    }`}
                                  >
                                    {hasSkill && <Check className="w-3 h-3 inline mr-1" />}
                                    {skill}
                                  </button>
                                );
                              })}
                              {(group.requiredSkills || []).length === 0 && (
                                <span className="text-xs text-muted-foreground italic">No skills defined for this group</span>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {(member.assignedSkills || []).length > 0 ? (
                                member.assignedSkills.map((skill) => (
                                  <span
                                    key={skill}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs rounded-full border border-emerald-500/20 font-medium"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No skills assigned</span>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Action Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-6 flex gap-3"
        >
          <Link href="/admin/rota-groups">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
              <Check className="w-5 h-5 mr-2" />
              Done
            </Button>
          </Link>
          <Link href={`/rota?groupId=${groupId}`}>
            <Button variant="outline" className="border-border">
              <Eye className="w-5 h-5 mr-2" />
              View Rota
            </Button>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
