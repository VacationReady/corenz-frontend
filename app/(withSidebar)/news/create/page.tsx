"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import NewsEditor from "@/components/news/NewsEditor";
import AudienceCampaignPanel from "@/components/news/AudienceCampaignPanel";
import NewsChip from "@/components/ui/NewsChip";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import FileDropzone, { FileDropzoneItem, UploadHelpers } from "@/components/ui/FileDropzone";
import {
  ArrowLeft,
  Save,
  Send,
  Video,
  X,
  Plus,
  Hash,
  Sparkles,
  Eye,
  Clock,
  AlertCircle,
} from "lucide-react";

type NewsUploadMeta = {
  path: string;
  url: string | null;
  name: string;
  size: number;
  type: string;
};

const uploadWithProgress = (
  endpoint: string,
  file: File,
  { onProgress, signal }: UploadHelpers,
) =>
  new Promise<any>((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      } else {
        onProgress(50);
      }
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) return;
      const status = xhr.status;
      if (status >= 200 && status < 300) {
        try {
          const json = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          resolve(json);
        } catch (error) {
          reject(error);
        }
      } else {
        const message = xhr.responseText || `Upload failed (${status})`;
        reject(new Error(message));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));

    signal.addEventListener("abort", () => {
      if (xhr.readyState !== XMLHttpRequest.DONE) {
        xhr.abort();
      }
    });

    xhr.send(formData);
  });

export default function CreateNewsPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [coverImage, setCoverImage] = useState("");
  const [coverStoragePath, setCoverStoragePath] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [attachmentItems, setAttachmentItems] = useState<
    FileDropzoneItem<NewsUploadMeta>[]
  >([]);
  const [coverItems, setCoverItems] = useState<FileDropzoneItem<NewsUploadMeta>[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [pinned, setPinned] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [audience, setAudience] = useState<{
    type?: "all" | "custom";
    departments?: string[];
    roles?: string[];
    locations?: string[];
  }>({ type: "all" });
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<
    "draft" | "publish" | null
  >(null);
  const [showPreview, setShowPreview] = useState(false);
  const handleAttachmentUpload = (
    file: File,
    helpers: UploadHelpers,
  ): Promise<NewsUploadMeta> =>
    uploadWithProgress("/api/news/attachment-upload", file, helpers) as Promise<NewsUploadMeta>;

  const handleCoverUpload = (
    file: File,
    helpers: UploadHelpers,
  ): Promise<NewsUploadMeta> =>
    uploadWithProgress("/api/news/cover-upload", file, helpers) as Promise<NewsUploadMeta>;

  useEffect(() => {
    const successful = coverItems.find(
      (item) => item.status === "success" && item.meta,
    );
    if (successful?.meta) {
      const meta = successful.meta as NewsUploadMeta;
      setCoverStoragePath(meta.path);
      setCoverImage(meta.url || meta.path || "");
    } else if (coverItems.length === 0 && coverStoragePath) {
      setCoverStoragePath(null);
      setCoverImage("");
    }
  }, [coverItems, coverStoragePath]);

  const clearCover = () => {
    setCoverImage("");
    setCoverStoragePath(null);
    if (coverItems.length) setCoverItems([]);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const validateForm = () => {
    if (!title.trim()) {
      toast.error("Please enter a title for your news post");
      return false;
    }
    if (!content || Object.keys(content).length === 0) {
      toast.error("Please add some content to your news post");
      return false;
    }
    if (
      !audience ||
      (!audience.type &&
        !audience.departments?.length &&
        !audience.roles?.length &&
        !audience.locations?.length)
    ) {
      toast.warning("No audience selected. Defaulting to all users.");
      setAudience({ type: "all" });
    }
    return true;
  };

  const handleSubmit = async (
    e: React.FormEvent | React.MouseEvent,
    asDraft = false,
  ) => {
    e.preventDefault();

    if (!validateForm()) return;

    const hasUploadingAttachments = attachmentItems.some(
      (item) => item.status === "uploading",
    );
    if (hasUploadingAttachments) {
      toast.error("Please wait for attachments to finish uploading.");
      return;
    }

    const hasFailedAttachments = attachmentItems.some(
      (item) => item.status === "error",
    );
    if (hasFailedAttachments) {
      toast.error("Remove or retry failed attachments before submitting.");
      return;
    }

    const hasUploadingCover = coverItems.some(
      (item) => item.status === "uploading",
    );
    if (hasUploadingCover) {
      toast.error("Please wait for the cover image upload to finish.");
      return;
    }

    const uploadedAttachments = attachmentItems
      .filter((item) => item.status === "success" && item.meta)
      .map((item) => item.meta as NewsUploadMeta);

    setIsSubmitting(true);
    setSubmittingAction(asDraft ? "draft" : "publish");

    try {
      const res = await fetch("/api/news", {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          coverImage:
            normalizeCoverForSave(coverStoragePath || coverImage) || null,
          videoEmbedUrl: videoUrl || null,
          attachments: uploadedAttachments,
          sendEmail,
          audience,
          tags,
          pinned,
          featured,
          publishedAt: asDraft ? null : new Date().toISOString(),
        }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        toast.success(
          asDraft
            ? "Draft saved successfully!"
            : "News post published successfully!"
        );
        router.push("/news");
      } else {
        const error = await res.text();
        toast.error(`Failed to ${asDraft ? "save draft" : "publish"}: ${error}`);
      }
    } catch (error) {
      toast.error("An error occurred while saving your post");
      console.error(error);
    } finally {
      setIsSubmitting(false);
      setSubmittingAction(null);
    }
  };

  function normalizeCoverForSave(input: string | null | undefined) {
    if (!input) return "";
    // If this is a Supabase signed URL, extract the object path after "documents/"
    try {
      if (input.startsWith("http") && input.includes("/object/sign/") && input.includes("documents/")) {
        const after = input.split("documents/")[1] || "";
        const pathOnly = after.split("?")[0] || "";
        return pathOnly;
      }
    } catch {}
    return input;
  }

  const handleAudienceRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  useEffect(() => {
    handleAudienceRefresh();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/news")}
                className="p-2 hover:bg-muted rounded-lg transition-all"
                type="button"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-foreground">Create News Post</h1>
                <p className="text-sm text-muted-foreground">
                  Share updates with your organization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                icon={<Eye className="w-4 h-4" />}
                className={cn(showPreview && "bg-muted")}
                onClick={() => setShowPreview(!showPreview)}
              >
                Preview
              </Button>
              <Button
                type="button"
                variant="secondary"
                icon={<Clock className="w-4 h-4" />}
                onClick={(e) => handleSubmit(e, true)}
                loading={isSubmitting && submittingAction === "draft"}
                loadingText="Saving draft..."
                disabled={isSubmitting && submittingAction !== "draft"}
              >
                Save Draft
              </Button>
              <Button
                type="button"
                variant="primary"
                icon={<Send className="w-4 h-4" />}
                onClick={(e) => handleSubmit(e, false)}
                loading={isSubmitting && submittingAction === "publish"}
                loadingText="Publishing..."
                disabled={isSubmitting && submittingAction !== "publish"}
                className="bg-gradient-to-r from-editorial-purple to-editorial-blue text-white shadow-lg hover:shadow-xl hover:scale-105 disabled:scale-100"
              >
                Publish Now
              </Button>
            </div>
          </div>
        </div>
      </div>

      <form
        onSubmit={(e) => handleSubmit(e, false)}
        className="max-w-7xl mx-auto px-6 py-8"
        onKeyDown={(e) => {
          if (
            e.key === "Enter" &&
            (e.target as HTMLElement).tagName !== "TEXTAREA"
          ) {
            e.preventDefault();
          }
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <label className="block text-sm font-medium text-foreground">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a compelling title for your news..."
                className={cn(
                  "w-full px-4 py-3 text-lg font-semibold",
                  "bg-card border border-border rounded-xl",
                  "focus:outline-none focus:ring-2 focus:ring-primary",
                  "placeholder:text-muted-foreground"
                )}
                required
              />
            </motion.div>

            {/* Cover Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-2"
            >
              <label className="block text-sm font-medium text-foreground">
                Cover Image
              </label>
              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    type="url"
                    value={coverImage}
                    onChange={(e) => {
                      setCoverImage(e.target.value);
                      setCoverStoragePath(null);
                      if (coverItems.length) setCoverItems([]);
                    }}
                    placeholder="https://example.com/image.jpg"
                    className={cn(
                      "flex-1 px-4 py-2",
                      "bg-card border border-border rounded-lg",
                      "focus:outline-none focus:ring-2 focus:ring-primary"
                    )}
                  />
                  {coverImage && (
                    <button
                      type="button"
                      onClick={clearCover}
                      className="h-10 rounded-lg border border-border px-4 text-sm font-medium transition hover:bg-muted"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <FileDropzone
                  files={coverItems}
                  onFilesChange={setCoverItems}
                  onUpload={handleCoverUpload}
                  multiple={false}
                  accept="image/*"
                  description="Upload a hero image for this post"
                  helperText="Images are stored securely in your tenant bucket."
                />
                {coverImage && (
                  <div className="relative mt-2 rounded-lg overflow-hidden">
                    <img
                      src={coverImage}
                      alt="Cover"
                      className="w-full h-48 object-cover"
                    />
                    <button
                      onClick={clearCover}
                      className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white transition hover:bg-black/70"
                      type="button"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Content Editor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <label className="block text-sm font-medium text-foreground">
                Content <span className="text-red-500">*</span>
              </label>
              <div className="border border-border rounded-xl overflow-hidden">
                <NewsEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Write your news content here. Type / for commands..."
                  minHeight="500px"
                />
              </div>
            </motion.div>

            {/* Video Embed */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-2"
            >
              <label className="block text-sm font-medium text-foreground">
                Video Embed URL
              </label>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/embed/..."
                  className={cn(
                    "flex-1 px-4 py-2",
                    "bg-card border border-border rounded-lg",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-all flex items-center gap-2"
                >
                  <Video className="w-4 h-4" />
                  Preview
                </button>
              </div>
            </motion.div>

            {/* Attachments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <label className="block text-sm font-medium text-foreground">
                Attachments
              </label>
              <FileDropzone
                files={attachmentItems}
                onFilesChange={setAttachmentItems}
                onUpload={handleAttachmentUpload}
                accept={[
                  ".pdf",
                  ".doc",
                  ".docx",
                  ".xls",
                  ".xlsx",
                  ".ppt",
                  ".pptx",
                  "image/*",
                ]}
                description="Upload supporting documents or images"
                helperText="Files are uploaded to your tenant's secure storage bucket."
              />
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card rounded-xl p-6 border border-border"
            >
              <div className="flex items-center gap-2 mb-4">
                <Hash className="w-5 h-5 text-editorial-purple" />
                <h3 className="font-semibold">Tags & Categories</h3>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Add a tag..."
                    className={cn(
                      "flex-1 px-3 py-2 text-sm",
                      "bg-background border border-border rounded-lg",
                      "focus:outline-none focus:ring-2 focus:ring-primary"
                    )}
                  />
                  <button
                    onClick={handleAddTag}
                    type="button"
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <NewsChip
                      key={tag}
                      onRemove={() => removeTag(tag)}
                      variant="primary"
                      size="sm"
                    >
                      {tag}
                    </NewsChip>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Post Settings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-xl p-6 border border-border"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-editorial-yellow" />
                <h3 className="font-semibold">Post Settings</h3>
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">📌 Pin Post</p>
                    <p className="text-xs text-muted-foreground">
                      Keep at the top of the feed
                    </p>
                  </div>
                  <Switch checked={pinned} onChange={setPinned} />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">⭐ Feature Post</p>
                    <p className="text-xs text-muted-foreground">
                      Highlight in the hero section
                    </p>
                  </div>
                  <Switch checked={featured} onChange={setFeatured} />
                </label>
                <label className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">📧 Send Email</p>
                    <p className="text-xs text-muted-foreground">
                      Notify audience via email
                    </p>
                  </div>
                  <Switch checked={sendEmail} onChange={setSendEmail} />
                </label>
              </div>
            </motion.div>

            {/* Audience Campaign Panel */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <AudienceCampaignPanel
                value={audience}
                onChange={setAudience}
                refreshKey={refreshKey}
                showScheduling={false}
                showNotifications={false}
              />
            </motion.div>
          </div>
        </div>

        {/* Form Validation Warning */}
        {(!title || !content) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-full backdrop-blur-sm">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <span className="text-sm text-yellow-700 dark:text-yellow-300">
                Please fill in required fields
              </span>
            </div>
          </motion.div>
        )}
      </form>
    </div>
  );
}