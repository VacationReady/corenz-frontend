'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Loader2,
  Users,
  Building2,
  MapPin,
  Briefcase,
  Award,
  Tag,
  Plus,
  Palette,
  Sparkles,
  UserPlus,
  Trash2,
  Search,
  Check,
  Pencil,
} from 'lucide-react';
import { RotaGroupIconPicker } from '@/components/rota/RotaGroupIconPicker';
import { RotaGroupColorPicker } from '@/components/rota/RotaGroupColorPicker';
import { getRotaGroupIcon } from '@/lib/rota-group-icons';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { useToast } from '@/hooks/use-toast';

interface Location {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

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
  Members?: Member[];
  _count: {
    Members: number;
    Shifts: number;
    ShiftRequirements: number;
  };
}

interface EditRotaGroupModalProps {
  isOpen: boolean;
  group: RotaGroup | null;
  onClose: () => void;
  onSuccess: () => void;
}


export default function EditRotaGroupModal({
  isOpen,
  group,
  onClose,
  onSuccess,
}: EditRotaGroupModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'members'>('details');
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState<Set<string>>(new Set());
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string[]>>({});
  const [selectedSkills, setSelectedSkills] = useState<Record<string, string[]>>({});
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locationId: '',
    departmentId: '',
    icon: 'warehouse',
    color: '#3B82F6',
    roles: [] as string[],
    requiredSkills: [] as string[],
    optionalTags: [] as string[],
  });

  const [newRole, setNewRole] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newTag, setNewTag] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && group) {
      setFormData({
        name: group.name || '',
        description: group.description || '',
        locationId: group.locationId || group.Location?.id || '',
        departmentId: group.departmentId || group.Department?.id || '',
        icon: group.icon || 'warehouse',
        color: group.color || '#3B82F6',
        roles: group.roles || [],
        requiredSkills: group.requiredSkills || [],
        optionalTags: group.optionalTags || [],
      });
      setMembers(group.Members || []);
      fetchDropdownData();
      fetchEmployees();
      setActiveTab('details');
      setErrors({});
    }
  }, [isOpen, group]);

  const fetchDropdownData = async () => {
    try {
      const [locationsRes, departmentsRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/departments'),
      ]);

      const locationsData = await locationsRes.json();
      const departmentsData = await departmentsRes.json();

      setLocations(locationsData.locations || []);
      setDepartments(departmentsData || []);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const fetchEmployees = async () => {
    if (!group) return;
    try {
      const [membersRes, employeesRes] = await Promise.all([
        fetch(`/api/rota-groups/${group.id}/members`),
        fetch('/api/employees?status=active&limit=all'),
      ]);

      const membersData = await membersRes.json();
      const employeesData = await employeesRes.json();

      setMembers(membersData.members || []);
      const rawEmployees = (employeesData.employees || employeesData.data || []) as any[];

      const normalizedEmployees: Employee[] = rawEmployees.map((emp: any) => {
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
      console.error('Error fetching employees:', error);
    }
  };

  const memberIds = new Set(members.map((m) => m.employeeId));
  const availableEmployees = allEmployees.filter((e) => !memberIds.has(e.id));

  const filteredEmployees = availableEmployees.filter(
    (emp) =>
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
        [employeeId]: formData.roles || [],
      });
      setSelectedSkills({
        ...selectedSkills,
        [employeeId]: formData.requiredSkills || [],
      });
    }
    setSelectedEmployees(newSelected);
  };

  const toggleRole = (employeeId: string, role: string) => {
    const currentRoles = selectedRoles[employeeId] || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    setSelectedRoles({
      ...selectedRoles,
      [employeeId]: newRoles,
    });
  };

  const toggleSkill = (employeeId: string, skill: string) => {
    const currentSkills = selectedSkills[employeeId] || [];
    const newSkills = currentSkills.includes(skill)
      ? currentSkills.filter((s) => s !== skill)
      : [...currentSkills, skill];

    setSelectedSkills({
      ...selectedSkills,
      [employeeId]: newSkills,
    });
  };

  const addSelectedMembers = async () => {
    if (!group || selectedEmployees.size === 0) return;

    try {
      const membersToAdd = Array.from(selectedEmployees).map((empId) => ({
        employeeId: empId,
        assignedRoles: selectedRoles[empId] || [],
        assignedSkills: selectedSkills[empId] || [],
      }));

      const response = await fetch(`/api/rota-groups/${group.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ members: membersToAdd }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: 'Failed to add members',
          description: error.error || 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Members added',
        description: `Added ${selectedEmployees.size} member(s) to the group`,
      });

      fetchEmployees();
      setSelectedEmployees(new Set());
      setSelectedRoles({});
    } catch (error) {
      console.error('Error adding members:', error);
      toast({
        title: 'Failed to add members',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  const removeMember = async (employeeId: string) => {
    if (!group) return;

    try {
      const response = await fetch(`/api/rota-groups/${group.id}/members/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: 'Failed to remove member',
          description: error.error || 'Something went wrong',
          variant: 'destructive',
        });
        return;
      }

      setMembers(members.filter((m) => m.employeeId !== employeeId));
      toast({
        title: 'Member removed',
        description: 'Member has been removed from the group',
      });
    } catch (error) {
      console.error('Error removing member:', error);
      toast({
        title: 'Failed to remove member',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    }
  };

  const startEditingMember = (member: Member) => {
    setEditingMemberId(member.employeeId);
  };

  const cancelEditingMember = () => {
    setEditingMemberId(null);
  };

  const toggleMemberRole = (member: Member, role: string) => {
    const currentRoles = member.assignedRoles || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];
    
    // Update local state immediately for responsiveness
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
    
    // Update local state immediately for responsiveness
    setMembers(members.map((m) => 
      m.employeeId === member.employeeId 
        ? { ...m, assignedSkills: newSkills }
        : m
    ));
  };

  const saveMemberChanges = async (member: Member) => {
    if (!group) return;

    setSavingMemberId(member.employeeId);
    try {
      const response = await fetch(`/api/rota-groups/${group.id}/members/${member.employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedRoles: member.assignedRoles,
          assignedSkills: member.assignedSkills,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast({
          title: 'Failed to update member',
          description: error.error || 'Something went wrong',
          variant: 'destructive',
        });
        // Refresh to get correct state
        fetchEmployees();
        return;
      }

      toast({
        title: 'Member updated',
        description: `${member.Employee.User.name}'s roles and skills have been updated`,
      });
      setEditingMemberId(null);
    } catch (error) {
      console.error('Error updating member:', error);
      toast({
        title: 'Failed to update member',
        description: 'Something went wrong',
        variant: 'destructive',
      });
      fetchEmployees();
    } finally {
      setSavingMemberId(null);
    }
  };

  const addRole = () => {
    if (newRole.trim() && !formData.roles.includes(newRole.trim())) {
      setFormData({ ...formData, roles: [...formData.roles, newRole.trim()] });
      setNewRole('');
    }
  };

  const removeRole = (role: string) => {
    setFormData({ ...formData, roles: formData.roles.filter((r) => r !== role) });
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.requiredSkills.includes(newSkill.trim())) {
      setFormData({ ...formData, requiredSkills: [...formData.requiredSkills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, requiredSkills: formData.requiredSkills.filter((s) => s !== skill) });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.optionalTags.includes(newTag.trim())) {
      setFormData({ ...formData, optionalTags: [...formData.optionalTags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, optionalTags: formData.optionalTags.filter((t) => t !== tag) });
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Group name is required';
    }

    if (formData.roles.length === 0) {
      newErrors.roles = 'At least one role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!group || !validate()) return;

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        locationId: formData.locationId || null,
        departmentId: formData.departmentId || null,
        icon: formData.icon,
        color: formData.color,
        roles: formData.roles,
        requiredSkills: formData.requiredSkills,
        optionalTags: formData.optionalTags,
      };

      const response = await fetch(`/api/rota-groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const description =
          (error?.details && Array.isArray(error.details) && error.details[0]?.message) ||
          error?.error ||
          'Failed to update rota group';
        toast({
          title: 'Unable to update rota group',
          description,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Rota group updated',
        description: `${formData.name} has been updated successfully.`,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating rota group:', error);
      toast({
        title: 'Failed to update rota group',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    setSelectedEmployees(new Set());
    setSelectedRoles({});
    setSelectedSkills({});
    setEditingMemberId(null);
    setSearchTerm('');
    onClose();
  };

  if (!isOpen || !group) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-card border border-border rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-xl border-b border-border p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="p-3 rounded-xl"
              style={{ backgroundColor: formData.color ? `${formData.color}15` : 'rgba(59, 130, 246, 0.1)' }}
            >
              {(() => {
                const IconComponent = getRotaGroupIcon(formData.icon);
                return <IconComponent className="w-7 h-7" style={{ color: formData.color || '#3B82F6' }} />;
              })()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Edit Rota Group</h2>
              <p className="text-muted-foreground text-sm mt-0.5">{group.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2.5 rounded-xl bg-muted hover:bg-muted/80 border border-border text-muted-foreground hover:text-foreground transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6">
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Group Details
              </div>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Members
                <span className="px-2 py-0.5 text-xs rounded-full bg-muted">{members.length}</span>
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  Basic Information
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    Group Name <span className="text-blue-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Distribution Center - Night Shift"
                    className="h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                  />
                  {errors.name && <p className="text-red-500 text-xs">{errors.name}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Warehouse operations during night hours"
                    rows={2}
                    className="rounded-lg border-muted/50 bg-white/50 dark:bg-white/5 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Palette className="w-4 h-4 text-blue-500" />
                      Icon
                    </Label>
                    <RotaGroupIconPicker
                      value={formData.icon}
                      onChange={(icon) => setFormData({ ...formData, icon })}
                      color={formData.color}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Palette className="w-4 h-4 text-blue-500" />
                      Color Theme
                    </Label>
                    <RotaGroupColorPicker
                      value={formData.color}
                      onChange={(color) => setFormData({ ...formData, color })}
                    />
                  </div>
                </div>
              </div>

              {/* Location & Department */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Building2 className="w-4 h-4 text-blue-500" />
                  Location & Department
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-blue-500" />
                      Location
                    </Label>
                    <Select
                      value={formData.locationId || 'none'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, locationId: value === 'none' ? '' : value })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No location</SelectItem>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-500" />
                      Department
                    </Label>
                    <Select
                      value={formData.departmentId || 'none'}
                      onValueChange={(value) =>
                        setFormData({ ...formData, departmentId: value === 'none' ? '' : value })
                      }
                    >
                      <SelectTrigger className="h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No department</SelectItem>
                        {departments.map((dept) => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Roles */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Briefcase className="w-4 h-4 text-blue-500" />
                  Roles <span className="text-blue-500">*</span>
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
                      placeholder="Enter role name"
                      className="flex-1 h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                    />
                    <Button type="button" onClick={addRole} className="px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>

                  {errors.roles && <p className="text-red-500 text-xs">{errors.roles}</p>}

                  <AnimatePresence>
                    {formData.roles.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {formData.roles.map((role) => (
                          <motion.span
                            key={role}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/30 text-sm font-medium"
                          >
                            <Briefcase className="w-3.5 h-3.5" />
                            {role}
                            <button type="button" onClick={() => removeRole(role)} className="hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </motion.span>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Required Skills */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Award className="w-4 h-4 text-emerald-500" />
                  Required Skills
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                      placeholder="e.g., RF Scanner Operation"
                      className="flex-1 h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                    />
                    <Button type="button" onClick={addSkill} className="px-4 h-10 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>

                  <AnimatePresence>
                    {formData.requiredSkills.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {formData.requiredSkills.map((skill) => (
                          <motion.span
                            key={skill}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/30 text-sm font-medium"
                          >
                            <Award className="w-3.5 h-3.5" />
                            {skill}
                            <button type="button" onClick={() => removeSkill(skill)} className="hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </motion.span>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Optional Tags */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Tag className="w-4 h-4 text-violet-500" />
                  Optional Certifications/Tags
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="e.g., Forklift License"
                      className="flex-1 h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                    />
                    <Button type="button" onClick={addTag} className="px-4 h-10 bg-violet-600 hover:bg-violet-700 text-white">
                      <Plus className="w-5 h-5" />
                    </Button>
                  </div>

                  <AnimatePresence>
                    {formData.optionalTags.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex flex-wrap gap-2"
                      >
                        {formData.optionalTags.map((tag) => (
                          <motion.span
                            key={tag}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full border border-violet-500/30 text-sm font-medium"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            {tag}
                            <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500 transition-colors">
                              <X className="w-4 h-4" />
                            </button>
                          </motion.span>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </form>
          ) : (
            /* Members Tab */
            <div className="space-y-6">
              {/* Add Members Section */}
              <div className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-foreground">Add Members</h3>
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
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      <Button onClick={addSelectedMembers} className="w-full mb-4 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20">
                        <Plus className="w-5 h-5 mr-2" />
                        Add {selectedEmployees.size} Selected Member{selectedEmployees.size !== 1 ? 's' : ''}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="max-h-48 overflow-y-auto space-y-2">
                  {filteredEmployees.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4 text-sm">No available employees found</p>
                  ) : (
                    filteredEmployees.slice(0, 10).map((emp) => (
                      <div
                        key={emp.id}
                        onClick={() => toggleEmployee(emp.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedEmployees.has(emp.id)
                            ? 'bg-blue-500/10 border-blue-500/50'
                            : 'bg-card border-border hover:border-blue-500/30'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              selectedEmployees.has(emp.id) ? 'bg-blue-500 border-blue-500' : 'border-muted-foreground/50'
                            }`}
                          >
                            {selectedEmployees.has(emp.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{emp.User.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{emp.User.email}</p>
                          </div>
                        </div>

                        {selectedEmployees.has(emp.id) && (formData.roles.length > 0 || formData.requiredSkills.length > 0) && (
                          <div className="mt-2 pt-2 border-t border-border space-y-2">
                            {formData.roles.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" /> Assign roles:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {formData.roles.map((role) => (
                                    <button
                                      key={role}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleRole(emp.id, role);
                                      }}
                                      className={`px-2 py-0.5 text-xs rounded-full border transition-all ${
                                        (selectedRoles[emp.id] || []).includes(role)
                                          ? 'bg-blue-500 text-white border-blue-500'
                                          : 'bg-muted text-muted-foreground border-border hover:border-blue-500/50'
                                      }`}
                                    >
                                      {role}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {formData.requiredSkills.length > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
                                  <Award className="w-3 h-3" /> Assign skills:
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {formData.requiredSkills.map((skill) => (
                                    <button
                                      key={skill}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleSkill(emp.id, skill);
                                      }}
                                      className={`px-2 py-0.5 text-xs rounded-full border transition-all ${
                                        (selectedSkills[emp.id] || []).includes(skill)
                                          ? 'bg-emerald-500 text-white border-emerald-500'
                                          : 'bg-muted text-muted-foreground border-border hover:border-emerald-500/50'
                                      }`}
                                    >
                                      {skill}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  {filteredEmployees.length > 10 && (
                    <p className="text-center text-muted-foreground py-2 text-xs">
                      Showing 10 of {filteredEmployees.length} employees. Use search to find more.
                    </p>
                  )}
                </div>
              </div>

              {/* Current Members */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold text-foreground">Current Members</h3>
                  <span className="text-sm text-muted-foreground px-2 py-1 bg-muted rounded-full">{members.length}</span>
                </div>

                {members.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed border-border">
                    <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-muted-foreground">No members yet</p>
                    <p className="text-sm text-muted-foreground/70">Add employees from the list above</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {members.map((member) => {
                      const isEditing = editingMemberId === member.employeeId;
                      const isSaving = savingMemberId === member.employeeId;
                      
                      return (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`p-4 bg-card rounded-lg border transition-all ${
                            isEditing 
                              ? 'border-blue-500/50 shadow-lg shadow-blue-500/10' 
                              : 'border-border hover:border-emerald-500/30'
                          }`}
                        >
                          {/* Member Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground truncate">{member.Employee.User.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{member.Employee.User.email}</p>
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
                                    <Trash2 className="w-4 h-4" />
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
                            {isEditing ? (
                              <div className="flex flex-wrap gap-1.5">
                                {formData.roles.map((role) => {
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
                                {formData.roles.length === 0 && (
                                  <span className="text-xs text-muted-foreground italic">No roles defined for this group</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {(member.assignedRoles || []).length > 0 ? (
                                  member.assignedRoles.map((role) => (
                                    <span
                                      key={role}
                                      className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-500/20"
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
                            {isEditing ? (
                              <div className="flex flex-wrap gap-1.5">
                                {formData.requiredSkills.map((skill) => {
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
                                {formData.requiredSkills.length === 0 && (
                                  <span className="text-xs text-muted-foreground italic">No skills defined for this group</span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {(member.assignedSkills || []).length > 0 ? (
                                  member.assignedSkills.map((skill) => (
                                    <span
                                      key={skill}
                                      className="px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20"
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
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card/95 backdrop-blur-xl border-t border-border p-4 flex gap-3">
          <Button type="button" onClick={handleClose} variant="outline" className="flex-1 h-11">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
