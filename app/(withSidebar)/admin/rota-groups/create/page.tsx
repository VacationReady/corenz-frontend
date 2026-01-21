'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Plus, 
  X, 
  Save, 
  Users, 
  Building2, 
  MapPin, 
  Briefcase, 
  Award, 
  Tag,
  ChevronRight,
  Palette,
  Sparkles,
  Shield,
  Search,
  Check
} from 'lucide-react';
import { RotaGroupIconPicker } from '@/components/rota/RotaGroupIconPicker';
import { RotaGroupColorPicker } from '@/components/rota/RotaGroupColorPicker';
import { getRotaGroupIcon } from '@/lib/rota-group-icons';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
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

// Collapsible Section Component
const FormSection = ({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = true,
  accentColor = "primary"
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  accentColor?: "primary" | "emerald" | "violet" | "amber";
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const iconColors = {
    primary: "text-blue-600 dark:text-blue-400",
    emerald: "text-emerald-600 dark:text-emerald-400",
    violet: "text-violet-600 dark:text-violet-400",
    amber: "text-amber-600 dark:text-amber-400",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-blue-500/10`}>
            <Icon className={`w-5 h-5 ${iconColors[accentColor]}`} />
          </div>
          <span className="font-semibold text-foreground">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function CreateRotaGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [managerSearch, setManagerSearch] = useState('');
  
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
    managerIds: [] as string[],
  });

  const [newRole, setNewRole] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchDropdownData = async () => {
    try {
      const [locationsRes, departmentsRes, employeesRes] = await Promise.all([
        fetch('/api/locations'),
        fetch('/api/departments'),
        fetch('/api/employees?status=active&limit=500'),
      ]);
      
      const locationsData = await locationsRes.json();
      const departmentsData = await departmentsRes.json();
      const employeesData = await employeesRes.json();
      
      setLocations(locationsData.locations || []);
      setDepartments(departmentsData || []);
      
      // Normalize employees data
      const rawEmployees = (employeesData.data || []) as any[];
      const normalizedEmployees: Employee[] = rawEmployees.map((emp: any) => {
        if (emp.User) {
          return {
            id: emp.id,
            User: {
              name: emp.User.name || [emp.User.firstName, emp.User.lastName].filter(Boolean).join(' ') || emp.User.email,
              email: emp.User.email,
            },
            Location: emp.Location ? { name: emp.Location.name } : emp.locationName ? { name: emp.locationName } : undefined,
            Department: emp.Department ? { name: emp.Department.name } : emp.departmentName ? { name: emp.departmentName } : undefined,
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
      
      // Sort alphabetically by name
      normalizedEmployees.sort((a, b) => a.User.name.localeCompare(b.User.name));
      setAllEmployees(normalizedEmployees);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        locationId: formData.locationId || undefined,
        departmentId: formData.departmentId || undefined,
        managerIds: formData.managerIds.length > 0 ? formData.managerIds : undefined,
      };

      const response = await fetch('/api/rota-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const description =
          (error?.details && Array.isArray(error.details) && error.details[0]?.message) ||
          error?.error ||
          'Failed to create rota group';
        toast({
          title: 'Unable to create rota group',
          description,
          variant: 'destructive',
        });
        return;
      }

      const data = await response.json();
      toast({
        title: 'Rota group created',
        description: `${formData.name} is ready to configure.`,
      });
      router.push(`/admin/rota-groups/${data.rotaGroup.id}/members`);
    } catch (error) {
      console.error('Error creating rota group:', error);
      toast({
        title: 'Failed to create rota group',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addRole = () => {
    if (newRole.trim() && !formData.roles.includes(newRole.trim())) {
      setFormData({ ...formData, roles: [...formData.roles, newRole.trim()] });
      setNewRole('');
    }
  };

  const removeRole = (role: string) => {
    setFormData({ ...formData, roles: formData.roles.filter(r => r !== role) });
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.requiredSkills.includes(newSkill.trim())) {
      setFormData({ ...formData, requiredSkills: [...formData.requiredSkills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, requiredSkills: formData.requiredSkills.filter(s => s !== skill) });
  };

  const addTag = () => {
    if (newTag.trim() && !formData.optionalTags.includes(newTag.trim())) {
      setFormData({ ...formData, optionalTags: [...formData.optionalTags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({ ...formData, optionalTags: formData.optionalTags.filter(t => t !== tag) });
  };

  const toggleManager = (employeeId: string) => {
    const newManagerIds = formData.managerIds.includes(employeeId)
      ? formData.managerIds.filter(id => id !== employeeId)
      : [...formData.managerIds, employeeId];
    setFormData({ ...formData, managerIds: newManagerIds });
  };

  const filteredEmployees = allEmployees.filter(emp =>
    emp.User.name.toLowerCase().includes(managerSearch.toLowerCase()) ||
    emp.User.email.toLowerCase().includes(managerSearch.toLowerCase())
  );

  const selectedManagers = allEmployees.filter(emp => formData.managerIds.includes(emp.id));

  const SelectedIcon = getRotaGroupIcon(formData.icon);

  return (
    <div className="w-full min-h-screen bg-content-panel">
      <div className="container mx-auto p-6 max-w-4xl">
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
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Users className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create Rota Group</h1>
              <p className="text-muted-foreground">
                Define a new scheduling pool for your workforce
              </p>
            </div>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <FormSection title="Basic Information" icon={Sparkles} accentColor="primary">
            <div className="space-y-4">
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
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Warehouse operations during night hours"
                  rows={3}
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
          </FormSection>

          {/* Location & Department */}
          <FormSection title="Location & Department" icon={Building2} accentColor="primary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  Location
                </Label>
                <Select
                  value={formData.locationId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, locationId: value === "none" ? "" : value })}
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
                  value={formData.departmentId || "none"}
                  onValueChange={(value) => setFormData({ ...formData, departmentId: value === "none" ? "" : value })}
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
          </FormSection>

          {/* Roles */}
          <FormSection title="Roles" icon={Briefcase} accentColor="primary">
            <p className="text-sm text-muted-foreground -mt-2 mb-3">
              Define the roles that exist in this group (e.g., Picker, Packer, Supervisor) <span className="text-blue-500">*</span>
            </p>
            
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
                <Button
                  type="button"
                  onClick={addRole}
                  className="px-4 h-10 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              <AnimatePresence>
                {formData.roles.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
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
                        <button
                          type="button"
                          onClick={() => removeRole(role)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FormSection>

          {/* Required Skills */}
          <FormSection title="Required Skills" icon={Award} accentColor="emerald">
            <p className="text-sm text-muted-foreground -mt-2 mb-3">
              Skills that all members of this group must have
            </p>
            
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
                <Button
                  type="button"
                  onClick={addSkill}
                  className="px-4 h-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              <AnimatePresence>
                {formData.requiredSkills.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
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
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FormSection>

          {/* Optional Tags */}
          <FormSection title="Optional Certifications/Tags" icon={Tag} accentColor="violet">
            <p className="text-sm text-muted-foreground -mt-2 mb-3">
              Additional qualifications (e.g., Forklift License, First Aid)
            </p>
            
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
                <Button
                  type="button"
                  onClick={addTag}
                  className="px-4 h-10 bg-violet-600 hover:bg-violet-700 text-white"
                >
                  <Plus className="w-5 h-5" />
                </Button>
              </div>

              <AnimatePresence>
                {formData.optionalTags.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
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
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </FormSection>

          {/* Team Managers */}
          <FormSection title="Team Managers" icon={Shield} accentColor="amber" defaultOpen={false}>
            <p className="text-sm text-muted-foreground -mt-2 mb-3">
              Select employees who can manage shifts and schedules for this team
            </p>
            
            <div className="space-y-3">
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={managerSearch}
                  onChange={(e) => setManagerSearch(e.target.value)}
                  placeholder="Search employees..."
                  className="pl-10 h-10 rounded-lg border-muted/50 bg-white/50 dark:bg-white/5"
                />
              </div>

              {/* Selected Managers */}
              <AnimatePresence>
                {selectedManagers.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-wrap gap-2"
                  >
                    {selectedManagers.map((emp) => (
                      <motion.span
                        key={emp.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-full border border-amber-500/30 text-sm font-medium"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        {emp.User.name}
                        <button
                          type="button"
                          onClick={() => toggleManager(emp.id)}
                          className="hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.span>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Employee List */}
              <div className="max-h-[200px] overflow-y-auto border border-border rounded-lg divide-y divide-border">
                {filteredEmployees.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {managerSearch ? 'No employees found' : 'No employees available'}
                  </div>
                ) : (
                  filteredEmployees.slice(0, 50).map((emp) => {
                    const isSelected = formData.managerIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleManager(emp.id)}
                        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${
                          isSelected ? 'bg-amber-500/10' : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          isSelected 
                            ? 'bg-amber-500 border-amber-500 text-white' 
                            : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-foreground truncate">{emp.User.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{emp.User.email}</div>
                        </div>
                        {(emp.Department || emp.Location) && (
                          <div className="text-xs text-muted-foreground">
                            {emp.Department?.name || emp.Location?.name}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
              {filteredEmployees.length > 50 && (
                <p className="text-xs text-muted-foreground text-center">
                  Showing first 50 results. Use search to find more.
                </p>
              )}
            </div>
          </FormSection>

          {/* Actions */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-3 pt-2"
          >
            <Button
              type="submit"
              disabled={loading || formData.roles.length === 0}
              className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 disabled:bg-muted disabled:cursor-not-allowed text-white font-medium rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Creating...' : 'Create Group & Add Members'}
            </Button>
            <Link
              href="/admin/rota-groups"
              className="px-6 h-12 rounded-xl bg-muted hover:bg-muted/80 font-medium transition-all flex items-center justify-center"
            >
              Cancel
            </Link>
          </motion.div>
        </form>
      </div>
    </div>
  );
}
