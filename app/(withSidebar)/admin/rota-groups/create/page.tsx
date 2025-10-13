'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X, Save } from 'lucide-react';
import Link from 'next/link';

interface Location {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

export default function CreateRotaGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    locationId: '',
    departmentId: '',
    icon: '🏭',
    color: '#8B5CF6',
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
      const response = await fetch('/api/rota-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          locationId: formData.locationId || null,
          departmentId: formData.departmentId || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Failed to create rota group');
        return;
      }

      const data = await response.json();
      router.push(`/admin/rota-groups/${data.rotaGroup.id}/members`);
    } catch (error) {
      console.error('Error creating rota group:', error);
      alert('Failed to create rota group');
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
  const colorOptions = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6'];

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
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">Create Rota Group</h1>
        <p className="text-muted-foreground">
          Define a new scheduling pool for your workforce
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Basic Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Group Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Distribution Center - Night Shift"
                className="w-full px-4 py-2 rounded-lg bg-background border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g., Warehouse operations during night hours"
                rows={3}
                className="w-full px-4 py-2 rounded-lg bg-background border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Icon
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`text-2xl p-3 rounded-lg transition-all ${
                        formData.icon === emoji
                          ? 'bg-blue-500/30 border-2 border-blue-500'
                          : 'bg-background border hover:bg-muted'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`h-12 rounded-lg transition-all ${
                        formData.color === color
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                          : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location & Department */}
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Location & Department</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Location
              </label>
              <select
                value={formData.locationId}
                onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Department
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Roles */}
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">
            Roles <span className="text-red-400">*</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Define the roles that exist in this group (e.g., Picker, Packer, Supervisor)
          </p>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRole())}
                placeholder="Enter role name"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addRole}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {formData.roles.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.roles.map((role) => (
                  <span
                    key={role}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30"
                  >
                    {role}
                    <button
                      type="button"
                      onClick={() => removeRole(role)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Required Skills */}
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Required Skills</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Skills that all members of this group must have
          </p>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                placeholder="e.g., RF Scanner Operation"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {formData.requiredSkills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-300 rounded-full border border-green-500/30"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Optional Tags */}
        <div className="bg-card border rounded-xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Optional Certifications/Tags</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Additional qualifications (e.g., Forklift License, First Aid)
          </p>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="e.g., Forklift License"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-all"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {formData.optionalTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.optionalTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || formData.roles.length === 0}
            className="flex-1 px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            {loading ? 'Creating...' : 'Create Group & Add Members'}
          </button>
          <Link
            href="/admin/rota-groups"
            className="px-6 py-3 rounded-lg bg-muted hover:bg-muted/80 font-medium transition-all"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
