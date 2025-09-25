"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Shield, Clock, User, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { PermissionDiff } from "./PermissionDiff";
import { ScreenPermissions } from "@/lib/permissions";
import { PermissionEditor } from "./PermissionEditor";

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

interface PermissionAudit {
  id: string;
  oldProfileId?: string;
  newProfileId?: string;
  oldPermissions?: any;
  newPermissions?: any;
  note?: string;
  changedAt: string;
  changedBy: {
    id: string;
    name?: string;
    email: string;
  };
  oldProfile?: PermissionProfile;
  newProfile?: PermissionProfile;
}

interface UserPermissions {
  user: {
    id: string;
    name?: string;
    email: string;
    role: string;
    permissionProfile?: PermissionProfile;
  };
  effectivePermissions: Record<string, string[]>;
  auditTrail: PermissionAudit[];
}

interface PermissionProfileManagementProps {
  employeeId: string;
}

export function PermissionProfileManagement({
  employeeId,
}: PermissionProfileManagementProps) {
  const { data: _session } = useSession();
  const [userPermissions, setUserPermissions] =
    useState<UserPermissions | null>(null);
  const [availableProfiles, setAvailableProfiles] = useState<
    PermissionProfile[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [note, setNote] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [expandedAudits, setExpandedAudits] = useState<Set<string>>(new Set());
  const [screensMeta, setScreensMeta] = useState<{
    screens: { key: string; label: string }[];
    actions: { key: "read" | "edit" | "delete"; label: string }[];
  } | null>(null);
  const [customPermissionsDraft, setCustomPermissionsDraft] = useState<
    Record<string, ("read" | "edit" | "delete")[]>
  >({});

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch user permissions and audit trail
      const userResponse = await fetch(`/api/users/${employeeId}/permissions`);
      if (!userResponse.ok) throw new Error("Failed to fetch user permissions");
      const userData = await userResponse.json();
      setUserPermissions(userData);
      // Pre-populate editor with effective permissions so ticks/crosses reflect current access
      if (userData?.effectivePermissions && typeof userData.effectivePermissions === "object") {
        const mapped: Record<string, ("read" | "edit" | "delete")[]> = {};
        Object.entries(userData.effectivePermissions as Record<string, string[]>).forEach(([screen, actions]) => {
          const filtered = actions.filter((a) => a === "read" || a === "edit" || a === "delete") as ("read" | "edit" | "delete")[];
          if (filtered.length > 0) mapped[screen] = filtered;
        });
        setCustomPermissionsDraft(mapped);
      }

      // Fetch available profiles
      const profilesResponse = await fetch("/api/permissions");
      if (!profilesResponse.ok) throw new Error("Failed to fetch profiles");
      const profilesData = await profilesResponse.json();
      setAvailableProfiles(profilesData.profiles);

      // Load screens/actions metadata
      const screensRes = await fetch("/api/permissions/screens");
      if (screensRes.ok) {
        const sm = await screensRes.json();
        setScreensMeta(sm);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load permission data");
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = async () => {
    if (!selectedProfileId) return;

    try {
      setChanging(true);

      const response = await fetch(`/api/users/${employeeId}/permissions`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          permissionProfileId:
            selectedProfileId === "none" ? null : selectedProfileId,
          note: note.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update permissions");
      }

      const updatedData = await response.json();
      setUserPermissions(updatedData);
      if (updatedData?.effectivePermissions) {
        const mapped: Record<string, ("read" | "edit" | "delete")[]> = {};
        Object.entries(updatedData.effectivePermissions as Record<string, string[]>).forEach(([screen, actions]) => {
          const filtered = actions.filter((a) => a === "read" || a === "edit" || a === "delete") as ("read" | "edit" | "delete")[];
          if (filtered.length > 0) mapped[screen] = filtered;
        });
        setCustomPermissionsDraft(mapped);
      }
      setSelectedProfileId("");
      setNote("");
      setShowConfirmDialog(false);

      toast.success("Permission profile updated successfully");
    } catch (error) {
      console.error("Error updating permissions:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update permissions",
      );
    } finally {
      setChanging(false);
    }
  };

  const handleSaveCustom = async () => {
    try {
      setChanging(true);
      const response = await fetch(`/api/users/${employeeId}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customPermissions: customPermissionsDraft, note }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save custom permissions");
      }
      const updatedData = await response.json();
      setUserPermissions(updatedData);
      if (updatedData?.effectivePermissions) {
        const mapped: Record<string, ("read" | "edit" | "delete")[]> = {};
        Object.entries(updatedData.effectivePermissions as Record<string, string[]>).forEach(([screen, actions]) => {
          const filtered = actions.filter((a) => a === "read" || a === "edit" || a === "delete") as ("read" | "edit" | "delete")[];
          if (filtered.length > 0) mapped[screen] = filtered;
        });
        setCustomPermissionsDraft(mapped);
      }
      setNote("");
      toast.success("Custom permissions saved");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setChanging(false);
    }
  };

  const toggleAuditExpansion = (auditId: string) => {
    const newExpanded = new Set(expandedAudits);
    if (newExpanded.has(auditId)) {
      newExpanded.delete(auditId);
    } else {
      newExpanded.add(auditId);
    }
    setExpandedAudits(newExpanded);
  };

  const getCurrentProfileDisplay = () => {
    if (!userPermissions?.user.permissionProfile) {
      return {
        name: userPermissions?.user.role || "Employee",
        description: `Default ${userPermissions?.user.role?.toLowerCase() || "employee"} permissions`,
        isBuiltIn: true,
      };
    }

    return {
      name: userPermissions.user.permissionProfile.name,
      description: userPermissions.user.permissionProfile.description,
      isBuiltIn: userPermissions.user.permissionProfile.builtIn,
    };
  };

  if (loading) {
    return <div className="text-sm text-gray-600">Loading permissions...</div>;
  }

  if (!userPermissions) {
    return (
      <div className="text-sm text-red-600">Failed to load permission data</div>
    );
  }

  const currentProfile = getCurrentProfileDisplay();

  return (
    <div className="space-y-4">
      {/* Current Profile Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <p className="font-medium">{currentProfile.name}</p>
            <p className="text-sm text-gray-600">
              {currentProfile.description}
            </p>
          </div>
          {currentProfile.isBuiltIn && (
            <Badge variant="secondary" className="text-xs">
              Built-in
            </Badge>
          )}
        </div>

        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Change Permissions
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Permission Profile</DialogTitle>
              <DialogDescription>
                Select a new permission profile for this employee. This will
                change their access to various parts of the system.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="profile-select">New Profile</Label>
                <Select
                  value={selectedProfileId}
                  onValueChange={setSelectedProfileId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a permission profile" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      Default ({userPermissions.user.role})
                    </SelectItem>
                    {availableProfiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name} {profile.builtIn && "(Built-in)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="note">Note (Optional)</Label>
                <Textarea
                  id="note"
                  placeholder="Reason for permission change..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={changing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProfileChange}
                disabled={!selectedProfileId || changing}
              >
                {changing ? "Updating..." : "Confirm Change"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Per-user overrides */}
      {screensMeta && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Edit permissions
            </CardTitle>
            <CardDescription>
              Toggle access per screen for this employee only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PermissionEditor
              screens={screensMeta.screens}
              actions={screensMeta.actions}
              value={customPermissionsDraft}
              onChange={setCustomPermissionsDraft}
            />
            <div className="mt-3 flex gap-2">
              <Button variant="outline" disabled={changing} onClick={() => setCustomPermissionsDraft({})}>
                Reset
              </Button>
              <Button disabled={changing} onClick={handleSaveCustom}>
                {changing ? "Saving..." : "Save overrides"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      {userPermissions.auditTrail && userPermissions.auditTrail.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Permission Changes
            </CardTitle>
            <CardDescription>
              History of permission profile changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userPermissions.auditTrail.slice(0, 5).map((audit) => {
                const hasPermissionDiff =
                  audit.oldPermissions && audit.newPermissions;
                const isExpanded = expandedAudits.has(audit.id);

                return (
                  <div
                    key={audit.id}
                    className="border rounded-md overflow-hidden"
                  >
                    <div
                      className="flex items-start justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() =>
                        hasPermissionDiff && toggleAuditExpansion(audit.id)
                      }
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="text-sm font-medium">
                            Changed by{" "}
                            {audit.changedBy.name || audit.changedBy.email}
                          </span>
                          {hasPermissionDiff &&
                            (isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            ))}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {audit.oldProfile?.name ||
                            `Default (${userPermissions.user.role})`}{" "}
                          →{" "}
                          {audit.newProfile?.name ||
                            `Default (${userPermissions.user.role})`}
                        </div>
                        {audit.note && (
                          <p className="text-sm text-gray-500 mt-1 italic">
                            &ldquo;{audit.note}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(audit.changedAt), "MMM d, yyyy HH:mm")}
                      </div>
                    </div>

                    {hasPermissionDiff && isExpanded && (
                      <div className="p-3 border-t bg-white">
                        <PermissionDiff
                          oldPermissions={JSON.parse(audit.oldPermissions)}
                          newPermissions={JSON.parse(audit.newPermissions)}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
