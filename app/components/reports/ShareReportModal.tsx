"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2,
  Link2,
  Copy,
  Check,
  User,
  Users,
  Building2,
  Globe,
  Trash2,
  Loader2,
  Mail,
  Calendar,
  Shield,
  Eye,
  Edit,
  UserCog,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Badge } from "@/components/ui/Badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/Switch";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistance, addDays } from "date-fns";

interface ShareReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportId: number;
  reportName: string;
  onSuccess?: () => void;
}

interface ReportShare {
  id: number;
  shareType: "user" | "team" | "department" | "company" | "link";
  permission: "view" | "edit" | "admin";
  userId?: string;
  departmentId?: string;
  teamId?: string;
  shareToken?: string;
  expiresAt?: string;
  createdAt: string;
  User?: {
    id: string;
    email: string;
    name?: string;
  };
  Department?: {
    id: string;
    name: string;
  };
  CreatedBy?: {
    id: string;
    email: string;
    name?: string;
  };
  shareLink?: string;
}

const PERMISSION_CONFIG = {
  view: {
    label: "Viewer",
    description: "Can view the report",
    icon: Eye,
    color: "text-blue-600",
  },
  edit: {
    label: "Editor",
    description: "Can view and modify filters",
    icon: Edit,
    color: "text-amber-600",
  },
  admin: {
    label: "Admin",
    description: "Full access including sharing",
    icon: UserCog,
    color: "text-violet-600",
  },
};

const SHARE_TYPE_CONFIG = {
  user: { icon: User, label: "Individual" },
  department: { icon: Building2, label: "Department" },
  company: { icon: Globe, label: "Company-wide" },
  link: { icon: Link2, label: "Share Link" },
};

export function ShareReportModal({
  isOpen,
  onClose,
  reportId,
  reportName,
  onSuccess,
}: ShareReportModalProps) {
  const { toast } = useToast();
  const [shares, setShares] = useState<ReportShare[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  
  // Form state for new share
  const [shareType, setShareType] = useState<"user" | "link">("user");
  const [userEmail, setUserEmail] = useState("");
  const [permission, setPermission] = useState<"view" | "edit" | "admin">("view");
  const [enableExpiration, setEnableExpiration] = useState(false);
  const [expirationDays, setExpirationDays] = useState("7");

  // Fetch existing shares
  const fetchShares = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/reports/share?reportId=${reportId}`);
      if (!res.ok) throw new Error("Failed to fetch shares");
      const data = await res.json();
      setShares(data.data || []);
    } catch (error) {
      console.error("Failed to fetch shares:", error);
    } finally {
      setIsLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    if (isOpen) {
      fetchShares();
    }
  }, [isOpen, fetchShares]);

  // Create new share
  const handleCreateShare = async () => {
    if (shareType === "user" && !userEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address to share with.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload: any = {
        reportId,
        shareType,
        permission,
      };

      if (shareType === "user") {
        // Look up user by email
        const userRes = await fetch(`/api/users/lookup?email=${encodeURIComponent(userEmail.trim())}`);
        if (!userRes.ok) {
          throw new Error("User not found. Please check the email address.");
        }
        const userData = await userRes.json();
        payload.userId = userData.id;
      }

      if (shareType === "link" && enableExpiration) {
        payload.expiresAt = addDays(new Date(), parseInt(expirationDays, 10)).toISOString();
      }

      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create share");
      }

      toast({
        title: "Share created",
        description: shareType === "link" 
          ? "Share link has been created."
          : `Report shared with ${userEmail}.`,
      });

      setUserEmail("");
      await fetchShares();
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Failed to share",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Remove share
  const handleRemoveShare = async (shareId: number) => {
    try {
      const res = await fetch(`/api/reports/share?id=${shareId}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to remove share");

      toast({
        title: "Share removed",
        description: "Access has been revoked.",
      });

      await fetchShares();
    } catch (error) {
      toast({
        title: "Failed to remove share",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  // Copy link to clipboard
  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
      setTimeout(() => setCopiedLink(null), 2000);
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const linkShares = shares.filter((s) => s.shareType === "link");
  const userShares = shares.filter((s) => s.shareType !== "link");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share Report
          </DialogTitle>
          <DialogDescription>
            Share "{reportName}" with team members or create a share link.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Share Type Toggle */}
          <div className="flex rounded-lg border p-1 bg-muted/30">
            <button
              onClick={() => setShareType("user")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                shareType === "user"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <User className="w-4 h-4" />
              Share with User
            </button>
            <button
              onClick={() => setShareType("link")}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all",
                shareType === "link"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Link2 className="w-4 h-4" />
              Create Link
            </button>
          </div>

          {/* User Share Form */}
          <AnimatePresence mode="wait">
            {shareType === "user" && (
              <motion.div
                key="user"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className="flex-1"
                    />
                    <Select value={permission} onValueChange={(v) => setPermission(v as typeof permission)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PERMISSION_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <config.icon className={cn("w-4 h-4", config.color)} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button onClick={handleCreateShare} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sharing...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </motion.div>
            )}

            {shareType === "link" && (
              <motion.div
                key="link"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Permission Level</span>
                    </div>
                    <Select value={permission} onValueChange={(v) => setPermission(v as typeof permission)}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PERMISSION_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <div className="flex items-center gap-2">
                              <config.icon className={cn("w-4 h-4", config.color)} />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">Set expiration</span>
                    </div>
                    <Switch checked={enableExpiration} onCheckedChange={setEnableExpiration} />
                  </div>

                  {enableExpiration && (
                    <div className="flex items-center gap-2 pl-7">
                      <span className="text-sm text-muted-foreground">Expires in</span>
                      <Select value={expirationDays} onValueChange={setExpirationDays}>
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 day</SelectItem>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Button onClick={handleCreateShare} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Link2 className="w-4 h-4 mr-2" />
                      Create Share Link
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Existing Shares */}
          {(userShares.length > 0 || linkShares.length > 0) && (
            <div className="pt-4 border-t space-y-4">
              <h4 className="text-sm font-semibold text-muted-foreground">Active Shares</h4>

              {isLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {/* User Shares */}
                  {userShares.map((share) => {
                    const config = PERMISSION_CONFIG[share.permission];
                    return (
                      <div
                        key={share.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {share.User?.name || share.User?.email || "Unknown user"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {config.label} • Shared {formatDistance(new Date(share.createdAt), new Date(), { addSuffix: true })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemoveShare(share.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}

                  {/* Link Shares */}
                  {linkShares.map((share) => {
                    const config = PERMISSION_CONFIG[share.permission];
                    const isExpired = share.expiresAt && new Date(share.expiresAt) < new Date();
                    const shareUrl = share.shareLink || `${window.location.origin}/reports/shared/${share.shareToken}`;
                    
                    return (
                      <div
                        key={share.id}
                        className={cn(
                          "p-3 rounded-lg border",
                          isExpired ? "bg-muted/50 border-dashed" : "bg-muted/30"
                        )}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <Link2 className={cn("w-4 h-4", isExpired && "text-muted-foreground")} />
                          <span className="text-sm font-medium flex-1">
                            {isExpired ? "Expired Link" : "Share Link"}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {config.label}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleRemoveShare(share.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        {!isExpired && (
                          <div className="flex items-center gap-2">
                            <Input
                              value={shareUrl}
                              readOnly
                              className="text-xs bg-background"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCopyLink(shareUrl)}
                            >
                              {copiedLink === shareUrl ? (
                                <Check className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        )}
                        
                        {share.expiresAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            {isExpired ? "Expired" : "Expires"} {format(new Date(share.expiresAt), "PPP")}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShareReportModal;

