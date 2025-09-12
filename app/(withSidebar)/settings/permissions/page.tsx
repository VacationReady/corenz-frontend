"use client";

<<<<<<< HEAD
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { getScreenDisplayName } from "@/lib/permissions";
=======
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Copy, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { getScreenDisplayName } from '@/lib/permissions';
import { PageShell } from '@/components/ui/PageShell';
import { breadcrumbConfigs } from '@/components/ui/Breadcrumb';
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec

interface PermissionProfile {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, string[]>;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
  };
}

interface ProfilesResponse {
  profiles: PermissionProfile[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function PermissionsPage() {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filterType, setFilterType] = useState<"all" | "builtin" | "custom">(
    "all",
  );
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "users">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [profileToDelete, setProfileToDelete] =
    useState<PermissionProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProfiles();
  }, [search, page, filterType, sortBy, sortOrder]);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search,
        page: page.toString(),
        limit: limit.toString(),
        filterType,
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/permissions?${params}`);
      if (!response.ok) throw new Error("Failed to fetch profiles");

      const data: ProfilesResponse = await response.json();
      setProfiles(data.profiles);
      setTotal(data.pagination.total);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Failed to load permission profiles");
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (profile: PermissionProfile) => {
    try {
      const response = await fetch(`/api/permissions/${profile.id}/clone`, {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to clone profile");
      }

      const clonedProfile = await response.json();

      // Add the cloned profile to the list and refresh
      fetchProfiles();
      toast.success(`Profile cloned as "${clonedProfile.name}"`);
    } catch (error) {
      console.error("Error cloning profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to clone profile",
      );
    }
  };

  const handleDelete = async () => {
    if (!profileToDelete) return;

    try {
      setDeleting(true);

      const response = await fetch(`/api/permissions/${profileToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete profile");
      }

      setProfiles(profiles.filter((p) => p.id !== profileToDelete.id));
      setShowDeleteDialog(false);
      setProfileToDelete(null);
      toast.success("Permission profile deleted successfully");
    } catch (error) {
      console.error("Error deleting profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete profile",
      );
    } finally {
      setDeleting(false);
    }
  };

  const getTotalScreens = (permissions: Record<string, string[]>) => {
    return Object.keys(permissions).length;
  };

  const getTotalPermissions = (permissions: Record<string, string[]>) => {
    return Object.values(permissions).reduce(
      (total, actions) => total + actions.length,
      0,
    );
  };

  return (
<<<<<<< HEAD
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Permission Profiles</h1>
          <p className="text-gray-600">
            Manage permission profiles for different user roles
          </p>
        </div>

=======
    <PageShell
      title="Permission Profiles"
      description="Manage permission profiles for different user roles"
      breadcrumbs={breadcrumbConfigs.settingsSection('Permission Profiles')}
      action={
>>>>>>> afc988c949ba7840bfa71e7339193d24419e21ec
        <Link href="/settings/permissions/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Profile
          </Button>
        </Link>
      }
      showHomeIcon={false}
    >
      <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                placeholder="Search profiles by name or description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
            <Select
              value={filterType}
              onValueChange={(value: any) => setFilterType(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Profiles</SelectItem>
                <SelectItem value="builtin">Built-in Only</SelectItem>
                <SelectItem value="custom">Custom Only</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(value) => {
                const [field, order] = value.split("-") as [
                  typeof sortBy,
                  typeof sortOrder,
                ];
                setSortBy(field);
                setSortOrder(order);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="createdAt-desc">Newest First</SelectItem>
                <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                <SelectItem value="users-desc">Most Users</SelectItem>
                <SelectItem value="users-asc">Least Users</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Profiles Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Permission Profiles ({total})
          </CardTitle>
          <CardDescription>
            Configure access levels for different user types
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Loading profiles...</div>
          ) : profiles.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No permission profiles found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Screens</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[50px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      {profile.name}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {profile.description || "No description"}
                    </TableCell>
                    <TableCell>
                      {getTotalScreens(profile.permissions)}
                    </TableCell>
                    <TableCell>
                      {getTotalPermissions(profile.permissions)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-500" />
                        {profile._count?.users || 0}
                      </div>
                    </TableCell>
                    <TableCell>
                      {profile.builtIn ? (
                        <Badge variant="secondary">Built-in</Badge>
                      ) : (
                        <Badge variant="outline">Custom</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu
                        trigger={
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        }
                        align="right"
                      >
                        <DropdownMenuItem asChild>
                          <Link
                            href={`/settings/permissions/${profile.id}/edit`}
                          >
                            <div className="flex items-center">
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </div>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleClone(profile)}>
                          <div className="flex items-center">
                            <Copy className="h-4 w-4 mr-2" />
                            Clone
                          </div>
                        </DropdownMenuItem>
                        {!profile.builtIn && (
                          <DropdownMenuItem
                            onClick={() => {
                              setProfileToDelete(profile);
                              setShowDeleteDialog(true);
                            }}
                          >
                            <div className="flex items-center text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </div>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {(page - 1) * limit + 1} to{" "}
                {Math.min(page * limit, total)} of {total} profiles
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * limit >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Permission Profile</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{profileToDelete?.name}"? This
              action cannot be undone.
              {profileToDelete?._count?.users &&
                profileToDelete._count.users > 0 && (
                  <span className="block mt-2 text-red-600 font-medium">
                    Warning: This profile is currently assigned to{" "}
                    {profileToDelete._count.users} user(s). They will lose their
                    custom permissions and fall back to role-based permissions.
                  </span>
                )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete Profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageShell>
  );
}
