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
import { Shield, Clock, User, ChevronDown, ChevronRight, History, Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { format } from "date-fns";
import { PermissionDiff } from "./PermissionDiff";
import { ScreenPermissions } from "@/lib/permissions";
import { PermissionEditor } from "./PermissionEditor";
import { ProfileUpdateSuccessAnimation } from "@/components/animations";

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
  const [screensMeta, setScreensMeta] = useState<{
    screens: { key: string; label: string }[];
    actions: { key: "read" | "edit" | "delete"; label: string }[];
  } | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [customPermissionsDraft, setCustomPermissionsDraft] = useState<
    Record<string, ("read" | "edit" | "delete")[]>
  >({});
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Helper to format profile name for display
  const formatProfileName = (name: string | null | undefined, fallbackRole: string) => {
    if (!name) return `Default (${fallbackRole})`;
    if (name.startsWith("USER_") && name.endsWith("_OVERRIDES")) {
      return "Custom Permissions";
    }
    return name;
  };

  // Helper to describe permission changes in plain English
  const describePermissionChange = (audit: PermissionAudit) => {
    const oldName = formatProfileName(audit.oldProfile?.name, userPermissions?.user.role || "Employee");
    const newName = formatProfileName(audit.newProfile?.name, userPermissions?.user.role || "Employee");
    
    if (oldName === newName && audit.oldPermissions && audit.newPermissions) {
      // Same profile, but permissions changed (custom permissions update)
      try {
        const oldPerms = typeof audit.oldPermissions === "string" ? JSON.parse(audit.oldPermissions) : audit.oldPermissions;
        const newPerms = typeof audit.newPermissions === "string" ? JSON.parse(audit.newPermissions) : audit.newPermissions;
        
        const changes: string[] = [];
        const allScreens = new Set([...Object.keys(oldPerms || {}), ...Object.keys(newPerms || {})]);
        
        allScreens.forEach(screen => {
          const oldActions = new Set(oldPerms?.[screen] || []);
          const newActions = new Set(newPerms?.[screen] || []);
          const screenLabel = screensMeta?.screens.find(s => s.key === screen)?.label || screen;
          
          const added = [...newActions].filter(a => !oldActions.has(a));
          const removed = [...oldActions].filter(a => !newActions.has(a));
          
          if (added.length > 0) {
            changes.push(`Added ${added.join(", ")} access to ${screenLabel}`);
          }
          if (removed.length > 0) {
            changes.push(`Removed ${removed.join(", ")} access from ${screenLabel}`);
          }
        });
        
        if (changes.length > 0) {
          return changes.slice(0, 2).join("; ") + (changes.length > 2 ? ` (+${changes.length - 2} more)` : "");
        }
      } catch {
        // Fall through to default
      }
    }
    
    return `Changed from ${oldName} to ${newName}`;
  };

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
      // Filter out any null/undefined profiles
      const validProfiles = (profilesData.profiles || []).filter((p: PermissionProfile | null | undefined) => p && p.id && p.name);
      setAvailableProfiles(validProfiles);

      // Load screens/actions metadata
      const screensRes = await fetch("/api/permissions/screens");
      if (screensRes.ok) {
        const sm = await screensRes.json();
        // Validate screens and actions arrays have valid entries
        const validScreens = (sm.screens || []).filter((s: any) => s && s.key && s.label);
        const validActions = (sm.actions || []).filter((a: any) => a && a.key && a.label);
        setScreensMeta({ screens: validScreens, actions: validActions });
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

      // Refetch fresh data to ensure UI is in sync with database
      await fetchData();
      
      setSelectedProfileId("");
      setNote("");
      setShowConfirmDialog(false);

      setShowSuccess(true);
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
      
      // Refetch fresh data to ensure UI is in sync with database
      await fetchData();
      
      setNote("");
      setShowSuccess(true);
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setChanging(false);
    }
  };

  const getCurrentProfileDisplay = () => {
    if (!userPermissions?.user.permissionProfile) {
      return {
        name: userPermissions?.user.role || "Employee",
        description: `Default ${userPermissions?.user.role?.toLowerCase() || "employee"} permissions`,
        isBuiltIn: true,
      };
    }

    const profileName = userPermissions.user.permissionProfile.name;
    
    // Check if this is a per-user override profile (has USER_*_OVERRIDES pattern)
    const isPerUserOverride = profileName?.startsWith("USER_") && profileName?.endsWith("_OVERRIDES");
    
    if (isPerUserOverride) {
      return {
        name: "Custom Permissions",
        description: "Personalized access settings for this employee",
        isBuiltIn: false,
      };
    }

    return {
      name: profileName,
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
                    {availableProfiles.filter(profile => profile && profile.id && profile.name).map((profile) => (
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

      {/* Permission Changes - Compact Summary */}
      {userPermissions.auditTrail && userPermissions.auditTrail.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Permission Changes</CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {userPermissions.auditTrail.length} change{userPermissions.auditTrail.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowHistoryModal(true)}
              >
                <Eye className="h-4 w-4 mr-1" />
                View all changes
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {/* Show most recent change as a summary */}
            {userPermissions.auditTrail.filter(a => a && a.id)[0] && (() => {
              const latestAudit = userPermissions.auditTrail.filter(a => a && a.id)[0];
              return (
                <div className="text-sm p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-foreground">Latest change</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(latestAudit.changedAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  <p className="text-muted-foreground">
                    {describePermissionChange(latestAudit)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    by {latestAudit.changedBy?.name || latestAudit.changedBy?.email || "Unknown"}
                    {latestAudit.note && <span className="italic"> — "{latestAudit.note}"</span>}
                  </p>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Permission History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Permission Change History
            </DialogTitle>
            <DialogDescription>
              Complete history of permission changes for this employee
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4">
              {userPermissions.auditTrail.filter(a => a && a.id).map((audit, index) => (
                <div 
                  key={audit.id} 
                  className={`relative pl-6 pb-4 ${index !== userPermissions.auditTrail.length - 1 ? "border-l-2 border-muted ml-2" : "ml-2"}`}
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                  
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {describePermissionChange(audit)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          by {audit.changedBy?.name || audit.changedBy?.email || "Unknown"}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                        {format(new Date(audit.changedAt), "MMM d, yyyy")}
                        <br />
                        {format(new Date(audit.changedAt), "h:mm a")}
                      </span>
                    </div>
                    
                    {audit.note && (
                      <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 mt-2">
                        "{audit.note}"
                      </p>
                    )}
                    
                    {/* Detailed diff for expanded view */}
                    {audit.oldPermissions && audit.newPermissions && (
                      <details className="mt-3">
                        <summary className="text-xs text-primary cursor-pointer hover:underline">
                          View detailed changes
                        </summary>
                        <div className="mt-2 p-3 bg-background rounded border">
                          <PermissionDiff
                            oldPermissions={typeof audit.oldPermissions === "string" ? JSON.parse(audit.oldPermissions) : audit.oldPermissions}
                            newPermissions={typeof audit.newPermissions === "string" ? JSON.parse(audit.newPermissions) : audit.newPermissions}
                          />
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ProfileUpdateSuccessAnimation
        isOpen={showSuccess}
        onClose={() => setShowSuccess(false)}
        fieldName="Permissions"
      />
    </div>
  );
}
