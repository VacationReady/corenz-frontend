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
  Sparkles
} from 'lucide-react';
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
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locationId: '',
    departmentId: '',
    icon: '🏭',
    color: '#3B82F6',
    roles: [] as string[],
    requiredSkills: [] as string[],
    optionalTags: [] as string[],
  });

  const [newRole, setNewRole] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchDropdownData();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        locationId: formData.locationId || undefined,
        departmentId: formData.departmentId || undefined,
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

  const emojiOptions = ['🏭', '🏪', '🍞', '🏥', '🏢', '📦', '🚛', '🏗️', '⚙️', '🔧'];
  const colorOptions = ['#3B82F6', '#2563EB', '#1D4ED8', '#10B981', '#059669', '#6366F1', '#4F46E5', '#14B8A6'];

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
                  <div className="grid grid-cols-5 gap-2">
                    {emojiOptions.map((emoji) => (
                      <motion.button
                        key={emoji}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFormData({ ...formData, icon: emoji })}
                        className={`text-xl p-2.5 rounded-lg transition-all ${
                          formData.icon === emoji
                            ? 'bg-blue-500/20 border-2 border-blue-500 shadow-md'
                            : 'bg-muted/50 border border-border hover:bg-muted'
                        }`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4 text-blue-500" />
                    Color Theme
                  </Label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((color) => (
                      <motion.button
                        key={color}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`h-10 rounded-lg transition-all ${
                          formData.color === color
                            ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background shadow-lg'
                            : 'hover:shadow-md'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
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
