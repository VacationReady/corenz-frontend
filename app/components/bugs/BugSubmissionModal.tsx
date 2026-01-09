"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Bug,
  AlertCircle,
  CheckCircle2,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Button from "@/components/ui/Button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  BugSeverity,
  BugFormData,
  BUG_VALIDATION,
  SEVERITY_INFO,
} from "@/types/bugs";

interface BugSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (bug: any) => void;
}

const ALLOWED_MIME_TYPES = BUG_VALIDATION.ALLOWED_MIME_TYPES;
const MAX_FILE_SIZE = BUG_VALIDATION.MAX_FILE_SIZE_BYTES;
const MAX_ATTACHMENTS = BUG_VALIDATION.MAX_ATTACHMENTS;

export default function BugSubmissionModal({
  isOpen,
  onClose,
  onSuccess,
}: BugSubmissionModalProps) {
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [severity, setSeverity] = useState<BugSeverity | "">("");
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Auto-captured metadata
  const [pageUrl, setPageUrl] = useState("");
  const [userAgent, setUserAgent] = useState("");

  // Capture metadata when modal opens
  useEffect(() => {
    if (isOpen && typeof window !== "undefined") {
      setPageUrl(window.location.href);
      setUserAgent(navigator.userAgent);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTitle("");
      setDescription("");
      setStepsToReproduce("");
      setSeverity("");
      setAttachments([]);
      setErrors({});
    }
  }, [isOpen]);

  // Validation
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length > BUG_VALIDATION.TITLE_MAX_LENGTH) {
      newErrors.title = `Title must be ${BUG_VALIDATION.TITLE_MAX_LENGTH} characters or less`;
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.length > BUG_VALIDATION.DESCRIPTION_MAX_LENGTH) {
      newErrors.description = `Description must be ${BUG_VALIDATION.DESCRIPTION_MAX_LENGTH} characters or less`;
    }

    if (stepsToReproduce.length > BUG_VALIDATION.STEPS_MAX_LENGTH) {
      newErrors.stepsToReproduce = `Steps must be ${BUG_VALIDATION.STEPS_MAX_LENGTH} characters or less`;
    }

    if (!severity) {
      newErrors.severity = "Severity is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, description, stepsToReproduce, severity]);

  // File handling
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      // Check MIME type
      if (!ALLOWED_MIME_TYPES.includes(file.type as any)) {
        toast.error(`File "${file.name}" has an unsupported type. Allowed: images, PDFs, text files.`);
        continue;
      }
      
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }
      
      // Check attachment count
      if (attachments.length >= MAX_ATTACHMENTS) {
        toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed.`);
        break;
      }
      
      setAttachments(prev => {
        if (prev.length >= MAX_ATTACHMENTS) return prev;
        // Avoid duplicates
        if (prev.some(f => f.name === file.name && f.size === file.size)) return prev;
        return [...prev, file];
      });
    }
    
    // Reset input
    e.target.value = "";
  }, [attachments.length]);

  const removeAttachment = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create the bug report
      const response = await fetch("/api/bugs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          stepsToReproduce: stepsToReproduce.trim() || undefined,
          severity,
          pageUrl,
          userAgent,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit bug report");
      }

      const { bug } = await response.json();

      // Upload attachments if any
      if (attachments.length > 0) {
        for (const file of attachments) {
          const formData = new FormData();
          formData.append("file", file);

          try {
            await fetch(`/api/bugs/${bug.id}/attachments`, {
              method: "POST",
              body: formData,
            });
          } catch (attachError) {
            console.error("Failed to upload attachment:", attachError);
            // Continue with other attachments even if one fails
          }
        }
      }

      toast.success("Bug report submitted successfully!", {
        description: "Thank you for helping us improve the platform.",
      });

      onSuccess?.(bug);
      onClose();
    } catch (error: any) {
      console.error("Error submitting bug report:", error);
      toast.error(error.message || "Failed to submit bug report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 bg-white dark:bg-slate-900 border-none shadow-2xl max-w-2xl rounded-2xl overflow-hidden" rawContent>
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400">
              <Bug className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold text-foreground">
                Report a Bug
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                Help us improve by reporting issues you encounter
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="bug-title" className="text-sm font-medium text-foreground/80">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="bug-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of the issue"
              maxLength={BUG_VALIDATION.TITLE_MAX_LENGTH}
              error={!!errors.title}
              className="h-11"
            />
            <div className="flex justify-between text-xs">
              {errors.title ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.title}
                </span>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                {title.length}/{BUG_VALIDATION.TITLE_MAX_LENGTH}
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="bug-description" className="text-sm font-medium text-foreground/80">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the issue in detail. What happened? What did you expect to happen?"
              maxLength={BUG_VALIDATION.DESCRIPTION_MAX_LENGTH}
              rows={4}
              className={errors.description ? "border-red-500 focus:ring-red-500/50" : ""}
            />
            <div className="flex justify-between text-xs">
              {errors.description ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.description}
                </span>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                {description.length}/{BUG_VALIDATION.DESCRIPTION_MAX_LENGTH}
              </span>
            </div>
          </div>

          {/* Steps to Reproduce */}
          <div className="space-y-2">
            <Label htmlFor="bug-steps" className="text-sm font-medium text-foreground/80">
              Steps to Reproduce <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="bug-steps"
              value={stepsToReproduce}
              onChange={(e) => setStepsToReproduce(e.target.value)}
              placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
              maxLength={BUG_VALIDATION.STEPS_MAX_LENGTH}
              rows={3}
              className={errors.stepsToReproduce ? "border-red-500 focus:ring-red-500/50" : ""}
            />
            <div className="flex justify-between text-xs">
              {errors.stepsToReproduce ? (
                <span className="text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.stepsToReproduce}
                </span>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground">
                {stepsToReproduce.length}/{BUG_VALIDATION.STEPS_MAX_LENGTH}
              </span>
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label htmlFor="bug-severity" className="text-sm font-medium text-foreground/80">
              Severity <span className="text-red-500">*</span>
            </Label>
            <Select value={severity} onValueChange={(val) => setSeverity(val as BugSeverity)}>
              <SelectTrigger 
                id="bug-severity"
                className={`h-11 ${errors.severity ? "border-red-500 focus:ring-red-500/50" : ""}`}
              >
                <SelectValue placeholder="Select severity level" />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SEVERITY_INFO) as BugSeverity[]).map((sev) => (
                  <SelectItem key={sev} value={sev}>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${SEVERITY_INFO[sev].bgColor}`} />
                      <span>{SEVERITY_INFO[sev].label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.severity && (
              <span className="text-red-500 text-xs flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.severity}
              </span>
            )}
          </div>

          {/* Attachments */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground/80">
              Attachments <span className="text-muted-foreground">(optional, max {MAX_ATTACHMENTS} files)</span>
            </Label>
            
            {/* File upload area */}
            <div className="relative">
              <input
                type="file"
                id="bug-attachments"
                multiple
                accept={ALLOWED_MIME_TYPES.join(",")}
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={attachments.length >= MAX_ATTACHMENTS}
              />
              <div className={`
                border-2 border-dashed rounded-xl p-6 text-center transition-colors
                ${attachments.length >= MAX_ATTACHMENTS 
                  ? "border-muted bg-muted/20 cursor-not-allowed" 
                  : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5 cursor-pointer"
                }
              `}>
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {attachments.length >= MAX_ATTACHMENTS 
                    ? "Maximum attachments reached"
                    : "Click or drag files here to upload"
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Images, PDFs, or text files up to 10MB each
                </p>
              </div>
            </div>

            {/* Attachment list */}
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  {attachments.map((file, index) => (
                    <motion.div
                      key={`${file.name}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-muted"
                    >
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getFileIcon(file.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Auto-captured info notice */}
          <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                We'll automatically capture the current page URL and browser information to help diagnose the issue.
              </p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border/50 bg-muted/30 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            loadingText="Submitting..."
            icon={<Bug className="h-4 w-4" />}
          >
            Submit Bug Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
