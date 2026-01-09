"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  MessageSquare,
  Send,
  Loader2,
  Lock,
  User,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { BugComment } from "@/types/bugs";

interface BugCommentsProps {
  bugId: string;
  comments: BugComment[];
  onCommentAdded?: (comment: BugComment) => void;
  isAdmin?: boolean;
  apiBasePath?: string;
}

/**
 * BugComments Component
 * 
 * Displays comments for a bug report and allows adding new comments.
 * Supports admin-only comments for tenant admins.
 * 
 * Requirements: 11.3, 11.5
 */
export function BugComments({
  bugId,
  comments,
  onCommentAdded,
  isAdmin = false,
  apiBasePath = "/api/bugs",
}: BugCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [isAdminOnly, setIsAdminOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (date: Date | string) => {
    try {
      return format(new Date(date), "dd MMM yyyy 'at' HH:mm");
    } catch {
      return "-";
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim()) {
      toast.error("Please enter a comment");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${apiBasePath}/${bugId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newComment.trim(),
          isAdminOnly: isAdmin ? isAdminOnly : false,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add comment");
      }

      const { comment } = await response.json();
      toast.success("Comment added successfully");
      setNewComment("");
      setIsAdminOnly(false);
      onCommentAdded?.(comment);
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error(error.message || "Failed to add comment");
    } finally {
      setIsSubmitting(false);
    }
  }, [bugId, newComment, isAdminOnly, isAdmin, apiBasePath, onCommentAdded]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground/80">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-xl border ${
                comment.isAdminOnly
                  ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-800"
                  : "bg-muted/30 border-muted"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                    <User className="h-3 w-3" />
                  </div>
                  <span className="text-sm font-medium">
                    {comment.author?.name || comment.author?.email || "Unknown"}
                  </span>
                  {comment.isAdminOnly && (
                    <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <Lock className="h-3 w-3" />
                      Admin only
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(comment.createdAt)}
                </span>
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap pl-7">
                {comment.content}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          No comments yet
        </p>
      )}

      {/* Add Comment Form */}
      <div className="space-y-3 pt-2 border-t border-border/50">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="w-full h-20 px-3 py-2 rounded-xl border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isSubmitting}
        />
        
        <div className="flex items-center justify-between">
          {isAdmin && (
            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={isAdminOnly}
                onChange={(e) => setIsAdminOnly(e.target.checked)}
                className="rounded border-input"
                disabled={isSubmitting}
              />
              <Lock className="h-3 w-3" />
              Admin only
            </label>
          )}
          {!isAdmin && <div />}
          
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!newComment.trim() || isSubmitting}
            loading={isSubmitting}
            icon={<Send className="h-4 w-4" />}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BugComments;
