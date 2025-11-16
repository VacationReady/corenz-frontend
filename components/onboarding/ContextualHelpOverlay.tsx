"use client";

import { useState } from "react";
import { HelpCircle, ExternalLink, Play, X, BookOpen, Tag } from "lucide-react";
import Button from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { Badge } from "@/components/ui/Badge";
import type { HelpContent, TenantSegment } from "@/lib/onboarding/help-content";
import {
  getHelpContent,
  getHelpForStepType,
  getRelatedHelp,
} from "@/lib/onboarding/help-content";

interface ContextualHelpButtonProps {
  /** Help content ID or step type */
  contentId?: string;
  stepType?: string;
  /** Tenant segment for filtering relevant content */
  segment?: TenantSegment;
  /** Button variant */
  variant?: "default" | "ghost" | "outline";
  /** Button size */
  size?: "sm" | "md" | "lg" | "icon";
  /** Custom label */
  label?: string;
  /** Show label text */
  showLabel?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Contextual Help Button
 * Displays a help icon that opens relevant help content
 */
export function ContextualHelpButton({
  contentId,
  stepType,
  segment,
  variant = "ghost",
  size = "sm",
  label,
  showLabel = false,
  className = "",
}: ContextualHelpButtonProps) {
  const [open, setOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<HelpContent | null>(null);

  const handleOpen = () => {
    // Get help content by ID or step type
    if (contentId) {
      const content = getHelpContent(contentId);
      if (content) {
        setSelectedContent(content);
        setOpen(true);
      }
    } else if (stepType) {
      const contents = getHelpForStepType(stepType, segment);
      if (contents.length > 0) {
        setSelectedContent(contents[0]); // Show first matching content
        setOpen(true);
      }
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleOpen}
        className={`inline-flex items-center gap-1 ${className}`}
        aria-label={label || "Get help"}
        type="button"
      >
        <HelpCircle className="w-4 h-4" aria-hidden="true" />
        {showLabel && <span>{label || "Help"}</span>}
      </Button>

      {selectedContent && (
        <ContextualHelpOverlay
          open={open}
          onOpenChange={setOpen}
          content={selectedContent}
          segment={segment}
        />
      )}
    </>
  );
}

interface ContextualHelpOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: HelpContent;
  segment?: TenantSegment;
}

/**
 * Contextual Help Overlay
 * Displays help content in a modal with video, articles, and related topics
 */
export function ContextualHelpOverlay({
  open,
  onOpenChange,
  content,
  segment,
}: ContextualHelpOverlayProps) {
  const relatedTopics = getRelatedHelp(content.id);
  const [selectedRelated, setSelectedRelated] = useState<HelpContent | null>(null);

  const handleRelatedClick = (related: HelpContent) => {
    setSelectedRelated(related);
  };

  const handleBackToMain = () => {
    setSelectedRelated(null);
  };

  const displayContent = selectedRelated || content;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {selectedRelated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBackToMain}
                  className="mb-2 -ml-2"
                >
                  ← Back
                </Button>
              )}
              <DialogTitle className="text-xl font-semibold pr-8">
                {displayContent.title}
              </DialogTitle>
              {displayContent.segment && (
                <Badge variant="outline" className="mt-2 text-xs">
                  {displayContent.segment.toUpperCase()}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription className="text-sm text-gray-600 leading-relaxed">
            {displayContent.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Video Section */}
          {displayContent.videoUrl && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Play className="w-4 h-4" />
                Video Tutorial
              </h3>
              <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border">
                {displayContent.videoThumbnail ? (
                  <div className="relative w-full h-full group cursor-pointer">
                    <img
                      src={displayContent.videoThumbnail}
                      alt={`${displayContent.title} tutorial`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-blue-600 ml-1" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400">
                    <div className="text-center">
                      <Play className="w-12 h-12 mx-auto mb-2" />
                      <p className="text-sm">Video content coming soon</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Note: Video tutorials are being created. URL placeholder: {displayContent.videoUrl}
              </p>
            </div>
          )}

          {/* Article Links */}
          {displayContent.articleLinks && displayContent.articleLinks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Documentation & Guides
              </h3>
              <div className="space-y-2">
                {displayContent.articleLinks.map((article, index) => (
                  <a
                    key={index}
                    href={article.url}
                    target={article.openInNewTab ? "_blank" : undefined}
                    rel={article.openInNewTab ? "noopener noreferrer" : undefined}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors group"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm group-hover:text-blue-700">
                        {article.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate mt-0.5">
                        {article.url}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {displayContent.tags && displayContent.tags.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Topics
              </h3>
              <div className="flex flex-wrap gap-2">
                {displayContent.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Related Topics */}
          {!selectedRelated && relatedTopics.length > 0 && (
            <div className="space-y-3 pt-4 border-t">
              <h3 className="text-sm font-semibold">Related Topics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {relatedTopics.map((related) => (
                  <button
                    key={related.id}
                    onClick={() => handleRelatedClick(related)}
                    className="text-left p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                  >
                    <div className="font-medium text-sm line-clamp-1">
                      {related.title}
                    </div>
                    <div className="text-xs text-gray-500 line-clamp-2 mt-1">
                      {related.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Need more help? Contact{" "}
            <a href="/support" className="text-blue-600 hover:underline">
              support
            </a>
          </p>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline Help Text
 * Shows help text inline without opening a dialog
 */
export function InlineHelp({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div
      className={`flex items-start gap-2 text-xs text-gray-600 bg-blue-50/50 border border-blue-200 rounded-lg p-3 ${className}`}
      role="note"
      aria-label="Help information"
    >
      <HelpCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
      <p>{text}</p>
    </div>
  );
}
