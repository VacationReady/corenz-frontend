"use client";

import React, { useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Bug,
  Calendar,
  Clock,
  Globe,
  Monitor,
  Download,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  BugReport,
  BugAttachment,
  STATUS_INFO,
  SEVERITY_INFO,
} from "@/types/bugs";

interface BugDetailModalProps {
  bug: BugReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function BugDetailModal({
  bug,
  isOpen,
  onClose,
}: BugDetailModalProps) {
  const [downloadingAttachment, setDownloadingAttachment] = useState<string | null>(null);

  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "-";
    try {
      return format(new Date(date), "dd MMM yyyy 'at' HH:mm");
    } catch {
      return "-";
    }
  };

  const handleDownloadAttachment = useCallback(async (attachment: BugAttachment) => {
    setDownloadingAttachment(attachment.id);
    try {
      const response = await fetch(`/api/bugs/attachments/${attachment.id}/download`);
      if (!response.ok) {
        throw new Error("Failed to get download URL");
      }
      const { url } = await response.json();
      
      // Open in new tab or trigger download
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

  if (!bug) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-2xl rounded-2xl overflow-hidden" rawContent>
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-border/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 shrink-0">
                <Bug className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl font-bold text-foreground truncate">
                  {bug.title}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1">
                  Submitted {formatDate(bug.createdAt)}
                </DialogDescription>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Status and Severity badges */}
          <div className="flex items-center gap-2 mt-4">
            <Badge
              className={`${STATUS_INFO[bug.status].bgColor} ${STATUS_INFO[bug.status].color} border-0`}
            >
              {STATUS_INFO[bug.status].label}
            </Badge>
            <Badge
              className={`${SEVERITY_INFO[bug.severity].bgColor} ${SEVERITY_INFO[bug.severity].color} border-0`}
            >
              {SEVERITY_INFO[bug.severity].label}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground/80">Description</h3>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
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

          {/* Metadata */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground/80">Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {bug.userAgent.length > 50 
                      ? bug.userAgent.substring(0, 50) + "..." 
                      : bug.userAgent}
                  </p>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-muted">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Submitted</p>
                  <p className="text-sm text-foreground">{formatDate(bug.createdAt)}</p>
                </div>
              </div>

              {/* Resolved Date */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-muted">
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Resolved</p>
                  <p className="text-sm text-foreground">
                    {bug.resolvedAt ? formatDate(bug.resolvedAt) : "Not yet resolved"}
                  </p>
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
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border/50 bg-muted/30 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
