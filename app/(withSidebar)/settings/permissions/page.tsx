"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Button from "@/components/ui/Button";
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
} from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  Shield,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { breadcrumbConfigs } from "@/components/ui/Breadcrumb";
import { FilterProvider, useFilters } from "@/components/ui/FilterProvider";
import { FilterBar } from "@/components/ui/FilterBar";
import { FilterOption } from "@/types/filter";
import {
  FilteredListEmpty,
  FilteredListLoading,
} from "@/components/ui/FilteredListState";

interface PermissionProfile {
  id: string;
  name: string;
  description?: string;
  permissions: Record<string, string[]>;
  builtIn: boolean;
  createdAt: string;
  updatedAt: string;
  constraints?: {
    departmentIds?: string[];
    jobRoles?: string[];
  } | null;
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

interface SimpleOption {
  id: string;
  name: string;
}

function PermissionsContent() {
  const { filters, clearFilters, isFiltered } = useFilters();

  const [profiles, setProfiles] = useState<PermissionProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [profileToDelete, setProfileToDelete] =
    useState<PermissionProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [departments, setDepartments] = useState<SimpleOption[]>([]);
  const [jobRoles, setJobRoles] = useState<SimpleOption[]>([]);

  useEffect(() => {
    let active = true;
    const loadMetadata = async () => {
      try {
        const [deptRes, roleRes] = await Promise.all([
          fetch("/api/departments"),
          fetch("/api/job-roles"),
        ]);

        if (!active) return;

        if (deptRes.ok) {
          const data = await deptRes.json();
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.departments)
            ? data.departments
            : [];
          setDepartments(
            list.map((dept: any) => ({ id: dept.id, name: dept.name })),
          );
        }

        if (roleRes.ok) {
          const data = await roleRes.json();
          const list = Array.isArray(data)
            ? data
            : Array.isArray(data?.jobRoles)
            ? data.jobRoles
            : [];
          setJobRoles(
            list.map((role: any) => ({ id: role.id, name: role.name })),
          );
        }
      } catch (error) {
        console.error("Failed to load filter metadata", error);
      }
    };

    loadMetadata();
    return () => {
      active = false;
    };
  }, []);

  const statusOptions: FilterOption[] = useMemo(
    () => [
      { label: "All Types", value: "all" },
      { label: "Built-in", value: "builtin" },
      { label: "Custom", value: "custom" },
    ],
    [],
  );

  const departmentOptions: FilterOption[] = useMemo(
    () => [
      { label: "All Departments", value: "all" },
      ...departments.map((dept) => ({ label: dept.name, value: dept.id })),
    ],
    [departments],
  );

  const jobRoleOptions: FilterOption[] = useMemo(
    () => [
      { label: "All Roles", value: "all" },
      ...jobRoles.map((role) => ({ label: role.name, value: role.id })),
    ],
    [jobRoles],
  );

  const sortOptions: FilterOption[] = useMemo(
    () => [
      { label: "Name", value: "name" },
      { label: "Created Date", value: "createdAt" },
      { label: "Users Assigned", value: "users" },
    ],
    [],
  );

  const selectedStatus = useMemo(
    () => filters.status.filter((value) => value !== "all"),
    [filters.status],
  );

  const statusKey = useMemo(() => selectedStatus.join(","), [selectedStatus]);

  useEffect(() => {
    setPage(1);
  }, [filters.search, statusKey, filters.sortBy, filters.sortOrder]);

  const fetchProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy: (filters.sortBy as string) || "name",
        sortOrder: (filters.sortOrder as string) || "asc",
      });

      const searchTerm = filters.search.trim();
      if (searchTerm) {
        params.set("search", searchTerm);
      }

      if (selectedStatus.length === 1) {
        params.set("filterType", selectedStatus[0]);
      } else {
        params.set("filterType", "all");
      }

      const response = await fetch(`/api/permissions?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch profiles");
      }

      const data: ProfilesResponse = await response.json();
      setProfiles(Array.isArray(data.profiles) ? data.profiles : []);
      setTotal(data.pagination?.total ?? 0);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      toast.error("Failed to load permission profiles");
      setProfiles([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    filters.search,
    filters.sortBy,
    filters.sortOrder,
    statusKey,
    page,
    limit,
    selectedStatus,
  ]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const filteredProfiles = useMemo(() => {
    let results = [...profiles];
    const selectedDepartments = filters.departments.filter(
      (value) => value !== "all",
    );
    const selectedJobRoles = filters.jobRoles.filter((value) => value !== "all");

    if (selectedDepartments.length > 0) {
      const allowed = new Set(selectedDepartments);
      results = results.filter((profile) => {
        const deptIds = profile.constraints?.departmentIds ?? [];
        if (deptIds.length === 0) return false;
        return deptIds.some((id) => allowed.has(id));
      });
    }

    if (selectedJobRoles.length > 0) {
      const allowed = new Set(selectedJobRoles);
      results = results.filter((profile) => {
        const roleIds = profile.constraints?.jobRoles ?? [];
        if (roleIds.length === 0) return false;
        return roleIds.some((id) => allowed.has(id));
      });
    }

    return results;
  }, [profiles, filters.departments, filters.jobRoles]);

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
      (count, actions) => count + actions.length,
      0,
    );
  };

  const paginationStart = (page - 1) * limit + 1;
  const paginationEnd = Math.min(page * limit, total);

  const displayedCount = isFiltered ? filteredProfiles.length : total;

  return (
    <PageShell
      title="Permission Profiles"
      description="Manage permission profiles for different user roles"
      breadcrumbs={breadcrumbConfigs.settingsSection("Permission Profiles")}
      action={
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
        <FilterBar
          config={{
            searchPlaceholder: "Search profiles by name or description...",
            showStatusFilter: true,
            showDepartmentFilter: true,
            showJobRoleFilter: true,
          }}
          statusOptions={statusOptions}
          departmentOptions={departmentOptions}
          jobRoleOptions={jobRoleOptions}
          sortOptions={sortOptions}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Permission Profiles ({displayedCount}
              {isFiltered ? ` of ${total}` : ""})
            </CardTitle>
            <CardDescription>
              Configure access levels for different user types
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <FilteredListLoading
                resourceName="Permission profiles"
                filters={filters}
                statusOptions={statusOptions}
                departmentOptions={departmentOptions}
                jobRoleOptions={jobRoleOptions}
              />
            ) : filteredProfiles.length === 0 ? (
              <FilteredListEmpty
                resourceName="Permission profiles"
                filters={filters}
                isFiltered={isFiltered}
                onClearFilters={isFiltered ? clearFilters : undefined}
                statusOptions={statusOptions}
                departmentOptions={departmentOptions}
                jobRoleOptions={jobRoleOptions}
              />
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
                  {filteredProfiles.map((profile) => (
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
                          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium">
                            Built-in
                          </span>
                        ) : (
                          <span className="rounded-full border px-2 py-1 text-xs font-medium">
                            Custom
                          </span>
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
                            <Link href={`/settings/permissions/${profile.id}/edit`}>
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

            {!loading && filteredProfiles.length > 0 && total > limit && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {paginationStart} to {paginationEnd} of {total} profiles
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((prev) => prev + 1)}
                    disabled={page * limit >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Permission Profile</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete "{profileToDelete?.name}"? This
                action cannot be undone.
                {profileToDelete?._count?.users &&
                  profileToDelete._count.users > 0 && (
                    <span className="mt-2 block text-red-600 font-medium">
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

export default function PermissionsPage() {
  return (
    <FilterProvider>
      <PermissionsContent />
    </FilterProvider>
  );
}
