"use client";

<<<<<<< HEAD
import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import {
  getAvailableScreens,
  getScreenDisplayName,
  getActionDisplayName,
  PermissionAction,
} from "@/lib/permissions";
=======
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { getAvailableScreens, getScreenDisplayName, getActionDisplayName, PermissionAction } from '@/lib/permissions';
import { PageShell } from '@/components/ui/PageShell';
import Link from 'next/link';
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec

const AVAILABLE_ACTIONS: PermissionAction[] = ["read", "edit", "delete"];

export default function NewPermissionProfilePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permissions: {} as Record<string, PermissionAction[]>,
  });

  const availableScreens = getAvailableScreens();
  const breadcrumbItems = [
    { label: 'Settings', href: '/settings' },
    { label: 'Permission Profiles', href: '/settings/permissions' },
    { label: 'Create Profile', isCurrentPage: true },
  ];

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

      const response = await fetch("/api/permissions", {
        method: "POST",
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
        throw new Error(error.error || "Failed to create profile");
      }

      const profile = await response.json();
      toast.success("Permission profile created successfully");
      router.push("/settings/permissions");
    } catch (error) {
      console.error("Error creating profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create profile",
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
        <div>
          <h1 className="text-2xl font-bold">Create Permission Profile</h1>
          <p className="text-gray-600">
            Define access permissions for this profile
          </p>
        </div>
      </div>

=======
    <PageShell
      title="Create Permission Profile"
      description="Define access permissions for this profile"
      breadcrumbs={{ items: breadcrumbItems }}
      showHomeIcon={false}
    >
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Basic details for the permission profile. Profiles apply
              company-wide and can be assigned to any user. Managers’
              permissions here govern what they can do across the system;
              reporting-line scoping is handled by feature logic (e.g., managers
              see only their team in Employees/Leave).
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
              />
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>
              Select the screens and actions this profile can access. “View” is
              required for “Edit/Delete.” Admin profiles typically have all
              permissions; Manager profiles usually include Employees, Leave,
              and Documents with edit, limited to their team by scope; Employee
              profiles should only have self-service features.
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
                          disabled={isActionDisabled(screen, action)}
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
                            isActionDisabled(screen, action)
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
          <Button type="submit" disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Creating..." : "Create Profile"}
          </Button>
        </div>
      </form>
    </PageShell>
  );
}
