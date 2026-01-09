"use client";

import { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Bug,
  X,
  Calendar,
  Globe,
  Monitor,
  Building2,
  User,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  Save,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  BugReportWithTenant,
  BugAttachment,
  BugStatus,
  STATUS_INFO,
  SEVERITY_INFO,
} from "@/types/bugs";

interface AdminBugDetailPanelProps {
  bug: BugReportWithTenant | null;
  isOpen: boolean;
  onClose: () => void;
  onBugUpdated: (bug: BugReportWithTenant) => void;
}

/**
 * AdminBugDetailPanel Component
 * 
 * Slide-out panel from right side for viewing and editing bug details.
 * Includes editable status dropdown and admin notes textarea.
 * 
 * Requirements: 7.6, 8.4, 8.5
 */
export function AdminBugDetailPanel({
  bug,
  isOpen,
  onClose,
  onBugUpdated,
}: AdminBugDetailPanelProps) {
  const [status, setStatus] = useState<BugStatus>(bug?.status || "OPEN");
  const [adminNotes, setAdminNotes] = useState(bug?.adminNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Reset form when bug changes
  useEffect(() => {
    if (bug) {
      setStatus(bug.status);
      setAdminNotes(bug.adminNotes || "");
      setHasChanges(false);
    }
  }, [bug]);

  // Track changes
  useEffect(() => {
    if (bug) {
      const statusChanged = status !== bug.status;
      const notesChanged = adminNotes !== (bug.adminNotes || "");
      setHasChanges(statusChanged || notesChanged);
    }
  }, [status, adminNotes, bug]);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy 'at' HH:mm");
    } catch {
      return "-";
    }
  };

  const handleSave = useCallback(async () => {
    if (!bug) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/tenant-admin/bugs/${bug.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          adminNotes: adminNotes || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update bug");
      }

      const { bug: updatedBug } = await response.json();
      toast.success("Bug report updated successfully");
      onBugUpdated(updatedBug);
      setHasChanges(false);
    } catch (error: any) {
      console.error("Error updating bug:", error);
      toast.error(error.message || "Failed to update bug report");
    } finally {
      setIsSaving(false);
    }
  }, [bug, status, adminNotes, onBugUpdated]);

  const handleDownloadAttachment = useCallback(async (attachment: BugAttachment) => {
    setDownloadingAttachment(attachment.id);
    try {
      const response = await fetch(`/api/bugs/attachments/${attachment.id}/download`);
      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }
      const { url } = await response.json();
      window.open(url, "_blank");
    } catch (error) {
      console.error("Error downloading attachment:", error);
      toast.error("Failed to download attachment");
    } finally {
      setDownloadingAttachment(null);
    }
  }, []);

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (!confirm("You have unsaved changes. Are you sure you want to close?")) {
        return;
      }
    }
    onClose();
  }, [hasChanges, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
        onClick={handleClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/50 flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
              <Bug className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground truncate">
                {bug?.title || "Bug Details"}
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {bug ? `Submitted ${formatDate(bug.createdAt)}` : ""}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {bug ? (
            <>
              {/* Status and Severity */}
              <div className="flex items-center gap-2">
                <Badge
                  className={`${SEVERITY_INFO[bug.severity].bgColor} ${SEVERITY_INFO[bug.severity].color} border-0`}
                >
                  {SEVERITY_INFO[bug.severity].label}
                </Badge>
              </div>

              {/* Editable Status */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80">
                  Status
                </label>
                <Select
                  value={status}
                  onValueChange={(val) => setStatus(val as BugStatus)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_INFO) as BugStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${STATUS_INFO[s].bgColor}`}
                          />
                          {STATUS_INFO[s].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground/80">Description</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-xl border border-muted">
                  {bug.description}
                </p>
              </div>

              {/* Steps to Reproduce */}
              {bug.stepsToReproduce && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground/80">Steps to Reproduce</h3>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-muted/30 p-4 rounded-xl border border-muted">
                    {bug.stepsToReproduce}
                  </p>
                </div>
              )}

              {/* Admin Notes (Editable) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground/80">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this bug..."
                  className="w-full h-32 px-4 py-3 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  These notes are only visible to tenant admins
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground/80">Details</h3>
                <div className="grid grid-cols-1 gap-3">
                  {/* Tenant */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Tenant</p>
                      <p className="text-sm text-foreground">{bug.company?.name || "-"}</p>
                    </div>
                  </div>

                  {/* Submitted By */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-muted">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Submitted By</p>
                      <p className="text-sm text-foreground">
                        {bug.submitter?.name || bug.submitter?.email || "-"}
                      </p>
                    </div>
                  </div>

                  {/* Page URL */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-muted">
                    <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Page URL</p>
                      <p className="text-sm text-foreground truncate" title={bug.pageUrl}>
                        {bug.pageUrl}
                      </p>
                    </div>
                  </div>

                  {/* Browser */}
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-muted">
                    <Monitor className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground">Browser</p>
                      <p className="text-sm text-foreground truncate" title={bug.userAgent}>
                        {bug.userAgent.length > 60
                          ? bug.userAgent.substring(0, 60) + "..."
                          : bug.userAgent}
                      </p>
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">Submitted</p>
                        <p className="text-sm text-foreground">{formatDate(bug.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-muted">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-muted-foreground">Resolved</p>
                        <p className="text-sm text-foreground">
                          {bug.resolvedAt ? formatDate(bug.resolvedAt) : "Not yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {bug.attachments && bug.attachments.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground/80">
                    Attachments ({bug.attachments.length})
                  </h3>
                  <div className="space-y-2">
                    {bug.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-muted hover:bg-muted/50 transition-colors"
                      >
                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                          {getFileIcon(attachment.mimeType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{attachment.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(attachment.fileSize)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadAttachment(attachment)}
                          disabled={downloadingAttachment === attachment.id}
                          className="shrink-0"
                        >
                          {downloadingAttachment === attachment.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">Select a bug to view details</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {bug && (
          <div className="px-6 py-4 border-t border-border/50 bg-muted/30 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              loading={isSaving}
              icon={<Save className="h-4 w-4" />}
            >
              Save Changes
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

export default AdminBugDetailPanel;
