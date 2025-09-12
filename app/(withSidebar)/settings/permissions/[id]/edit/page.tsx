"use client";

<<<<<<< HEAD
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/Badge";
import { ArrowLeft, Save, Shield } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  getAvailableScreens,
  getScreenDisplayName,
  getActionDisplayName,
  PermissionAction,
} from "@/lib/permissions";
=======
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/Badge';
import { Save, Shield, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/ui/PageShell';
import { getAvailableScreens, getScreenDisplayName, getActionDisplayName, PermissionAction } from '@/lib/permissions';
import Link from 'next/link';
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec

const AVAILABLE_ACTIONS: PermissionAction[] = ["read", "edit", "delete"];

interface PermissionProfile {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, PermissionAction[]>;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function EditPermissionProfilePage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PermissionProfile | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {} as Record<string, PermissionAction[]>,
  });

  const availableScreens = getAvailableScreens();
  const breadcrumbItems = [
    { label: 'Settings', href: '/settings' },
    { label: 'Permission Profiles', href: '/settings/permissions' },
    { label: 'Edit Profile', isCurrentPage: true },
  ];
  const title = profile ? `Edit ${profile.name}` : 'Edit Permission Profile';

  useEffect(() => {
    if (params?.id) {
      fetchProfile();
    }
  }, [params?.id]);

  const fetchProfile = async () => {
    if (!params?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/permissions/${params.id}`);

      if (!response.ok) {
        if (response.status === 404) {
          toast.error("Profile not found");
          router.push("/settings/permissions");
          return;
        }
        throw new Error("Failed to fetch profile");
      }

      const profileData = await response.json();
      setProfile(profileData);
      setFormData({
        name: profileData.name,
        description: profileData.description || "",
        permissions: profileData.permissions,
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (
    screen: string,
    action: PermissionAction,
    checked: boolean,
  ) => {
    setFormData((prev) => {
      const currentPermissions = prev.permissions[screen] || [];
      let newPermissions: PermissionAction[];

      if (checked) {
        newPermissions = [...currentPermissions, action];
        // If adding edit or delete, ensure read is also included
        if (
          (action === "edit" || action === "delete") &&
          !newPermissions.includes("read")
        ) {
          newPermissions.push("read");
        }
      } else {
        newPermissions = currentPermissions.filter((a) => a !== action);
        // If removing read, also remove edit and delete
        if (action === "read") {
          newPermissions = newPermissions.filter(
            (a) => a !== "edit" && a !== "delete",
          );
        }
      }

      const newPermissionsObj = { ...prev.permissions };
      if (newPermissions.length > 0) {
        newPermissionsObj[screen] = newPermissions;
      } else {
        delete newPermissionsObj[screen];
      }

      return {
        ...prev,
        permissions: newPermissionsObj,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!params?.id) {
      toast.error("Invalid profile ID");
      return;
    }

    if (!formData.name.trim()) {
      toast.error("Profile name is required");
      return;
    }

    if (Object.keys(formData.permissions).length === 0) {
      toast.error("At least one permission must be selected");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(`/api/permissions/${params.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || undefined,
          permissions: formData.permissions,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update profile");
      }

      const updatedProfile = await response.json();
      toast.success("Permission profile updated successfully");
      router.push("/settings/permissions");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  };

  const isActionChecked = (screen: string, action: PermissionAction) => {
    return (formData.permissions[screen] || []).includes(action);
  };

  const isActionDisabled = (screen: string, action: PermissionAction) => {
    if (action === "read") return false;
    // Edit and delete are disabled if read is not checked
    return !isActionChecked(screen, "read");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" disabled>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profiles
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Permission Profile</h1>
            <p className="text-gray-600">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/settings/permissions">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Profiles
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Edit Permission Profile</h1>
            <p className="text-red-600">Profile not found</p>
          </div>
        </div>
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings/permissions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profiles
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Edit Permission Profile</h1>
            <p className="text-gray-600">
              Modify access permissions for this profile
            </p>
          </div>
          {profile.builtIn && (
            <Badge variant="secondary">Built-in Profile</Badge>
          )}
        </div>
      </div>

=======
    <PageShell
      title={title}
      description="Modify access permissions for this profile"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
      {profile?.builtIn && (
        <Badge variant="secondary" className="mb-4">Built-in Profile</Badge>
      )}
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Profiles are company-wide templates that can be assigned to users.
              Manager permissions here define capabilities; team-scoping is
              applied by the app (e.g., Managers see their reports in
              Employees/Leave).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Profile Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Sales Manager, HR Assistant"
                required
                disabled={profile.builtIn}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Describe the role and responsibilities..."
                rows={3}
                disabled={profile.builtIn}
              />
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>
              Choose View/Edit/Delete for each screen. Edit/Delete require View.
              Recommended defaults: Admin = all; Manager = Employees, Documents,
              Leave (edit) and Reports (view); Employee = self-service only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {availableScreens.map((screen) => (
                <div key={screen} className="border rounded-lg p-4">
                  <h3 className="font-medium text-lg mb-3">
                    {getScreenDisplayName(screen)}
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {AVAILABLE_ACTIONS.map((action) => (
                      <div key={action} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${screen}-${action}`}
                          checked={isActionChecked(screen, action)}
                          disabled={
                            isActionDisabled(screen, action) || profile.builtIn
                          }
                          onCheckedChange={(checked) =>
                            handlePermissionChange(
                              screen,
                              action,
                              checked as boolean,
                            )
                          }
                        />
                        <Label
                          htmlFor={`${screen}-${action}`}
                          className={`text-sm ${
                            isActionDisabled(screen, action) || profile.builtIn
                              ? "text-gray-400"
                              : ""
                          }`}
                        >
                          {getActionDisplayName(action)}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link href="/settings/permissions">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving || profile.builtIn}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
