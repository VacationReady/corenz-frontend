"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import NewsEditor from "@/components/news/NewsEditor";
import NewsContentTipTapRenderer from "@/components/news/NewsContentTipTapRenderer";
import AudienceCampaignPanel from "@/components/news/AudienceCampaignPanel";
import NewsChip from "@/components/ui/NewsChip";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import FileDropzone, {
  FileDropzoneItem,
  UploadHelpers,
} from "@/components/ui/FileDropzone";
import Modal from "@/components/ui/Modal";
import {
  ArrowLeft,
  Send,
  Video,
  X,
  Plus,
  Hash,
  Sparkles,
  Eye,
  Clock,
  AlertCircle,
  Trash2,
} from "lucide-react";

/** ---------------- Draft management types & helpers ---------------- */
interface NewsDraftPayload {
  title: string;
  content: any;
  coverImage: string;
  videoUrl: string;
  tags: string[];
  pinned: boolean;
  featured: boolean;
  sendEmail: boolean;
  audience: {
    type?: "all" | "custom";
    departments?: string[];
    roles?: string[];
    locations?: string[];
  };
  isDraft: boolean;
}

const hasMeaningfulDraft = (draft: NewsDraftPayload | null | undefined) => {
  if (!draft) return false;
  const hasContent = (() => {
    const value = draft.content;
    if (!value) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  })();
  return (
    Boolean(draft.title?.trim()) ||
    hasContent ||
    Boolean(draft.coverImage?.trim()) ||
    Boolean(draft.videoUrl?.trim()) ||
    (Array.isArray(draft.tags) && draft.tags.length > 0) ||
    draft.pinned ||
    draft.featured ||
    draft.sendEmail ||
    (draft.audience &&
      ((draft.audience.departments || []).length > 0 ||
        (draft.audience.roles || []).length > 0 ||
        (draft.audience.locations || []).length > 0 ||
        draft.audience.type === "custom"))
  );
};

/** ---------------- Upload types & helpers ---------------- */
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
  const { data: session } = useSession();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [coverImage, setCoverImage] = useState("");
  const [coverStoragePath, setCoverStoragePath] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [attachmentItems, setAttachmentItems] = useState<
    FileDropzoneItem<NewsUploadMeta>[]
  >([]);
  const [coverItems, setCoverItems] = useState<
    FileDropzoneItem<NewsUploadMeta>[]
  >([]);
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

  // Draft refs
  const coverFileInputRef = useRef<HTMLInputElement | null>(null);
  const latestDraftRef = useRef<NewsDraftPayload>({
    title: "",
    content: null,
    coverImage: "",
    videoUrl: "",
    tags: [],
    pinned: false,
    featured: false,
    sendEmail: false,
    audience: { type: "all" },
    isDraft: false,
  });
  const restorePromptedRef = useRef(false);

  const autosaveKey = session?.user
    ? `news:create:${session.user.companyId}:${session.user.id}`
    : null;

  const clearDraftStorage = (resetState = false) => {
    if (typeof window !== "undefined" && autosaveKey) {
      try {
        window.localStorage.removeItem(autosaveKey);
      } catch (error) {
        console.error("Failed to clear news draft", error);
      }
    }
    if (resetState) {
      setTitle("");
      setContent(null);
      setCoverImage("");
      setVideoUrl("");
      setAttachmentItems([]);
      setTags([]);
      setTagInput("");
      setPinned(false);
      setFeatured(false);
      setIsDraft(false);
      setSendEmail(false);
      setAudience({ type: "all" });
      setShowPreview(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = "";
    }
  };

  const handleDiscardDraft = () => {
    if (typeof window !== "undefined") {
      const confirmed = window.confirm(
        "Discard the autosaved draft? This cannot be undone.",
      );
      if (!confirmed) return;
    }
    clearDraftStorage(true);
    toast.success("Draft discarded");
  };

  const handleAttachmentUpload = (
    file: File,
    helpers: UploadHelpers,
  ): Promise<NewsUploadMeta> =>
    uploadWithProgress(
      "/api/news/attachment-upload",
      file,
      helpers,
    ) as Promise<NewsUploadMeta>;

  const handleCoverUpload = (
    file: File,
    helpers: UploadHelpers,
  ): Promise<NewsUploadMeta> =>
    uploadWithProgress(
      "/api/news/cover-upload",
      file,
      helpers,
    ) as Promise<NewsUploadMeta>;

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
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
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

    // Retain draft flag
    setIsDraft(asDraft);

    // Ensure uploads are complete/healthy
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
          asDraft ? "Draft saved successfully!" : "News post published successfully!",
        );
        clearDraftStorage(false);
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
      if (
        input.startsWith("http") &&
        input.includes("/object/sign/") &&
        input.includes("documents/")
      ) {
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

  // Keep latest draft snapshot
  useEffect(() => {
    latestDraftRef.current = {
      title,
      content,
      coverImage,
      videoUrl,
      tags,
      pinned,
      featured,
      sendEmail,
      audience,
      isDraft,
    };
  }, [
    title,
    content,
    coverImage,
    videoUrl,
    tags,
    pinned,
    featured,
    sendEmail,
    audience,
    isDraft,
  ]);

  // Reset restore prompted flag when key changes
  useEffect(() => {
    restorePromptedRef.current = false;
  }, [autosaveKey]);

  // Autosave interval
  useEffect(() => {
    if (!autosaveKey) return;
    if (typeof window === "undefined") return;

    const interval = window.setInterval(() => {
      const draft = latestDraftRef.current;
      if (!hasMeaningfulDraft(draft)) {
        try {
          window.localStorage.removeItem(autosaveKey);
        } catch (error) {
          console.error("Failed to prune empty news draft", error);
        }
        return;
      }

      try {
        window.localStorage.setItem(
          autosaveKey,
          JSON.stringify({
            ...draft,
            updatedAt: new Date().toISOString(),
          }),
        );
      } catch (error) {
        console.error("Failed to persist news draft", error);
      }
    }, 5000);

    return () => window.clearInterval(interval);
  }, [autosaveKey]);

  // Attempt restore on mount/key change
  useEffect(() => {
    if (!autosaveKey) return;
    if (restorePromptedRef.current) return;
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(autosaveKey);
    if (!stored) {
      restorePromptedRef.current = true;
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<NewsDraftPayload> & {
        updatedAt?: string;
      };
      if (!hasMeaningfulDraft(parsed as NewsDraftPayload)) {
        window.localStorage.removeItem(autosaveKey);
        restorePromptedRef.current = true;
        return;
      }

      const restoreMessage = parsed?.updatedAt
        ? `A locally saved draft from ${new Date(
            parsed.updatedAt,
          ).toLocaleString()} was found. Restore it?`
        : "A locally saved draft was found. Restore it?";
      const shouldRestore = window.confirm(restoreMessage);
      if (shouldRestore) {
        setTitle(parsed?.title || "");
        setContent(parsed?.content ?? null);
        setCoverImage(parsed?.coverImage || "");
        setVideoUrl(parsed?.videoUrl || "");
        setTags(parsed?.tags || []);
        setPinned(Boolean(parsed?.pinned));
        setFeatured(Boolean(parsed?.featured));
        setSendEmail(Boolean(parsed?.sendEmail));
        setAudience(parsed?.audience || { type: "all" });
        setIsDraft(Boolean(parsed?.isDraft));
        setAttachmentItems([]);
        setTagInput("");
        setShowPreview(false);
        if (coverFileInputRef.current) coverFileInputRef.current.value = "";
        toast.info("Draft restored from this device");
      } else {
        window.localStorage.removeItem(autosaveKey);
      }
    } catch (error) {
      console.error("Failed to restore news draft", error);
      window.localStorage.removeItem(autosaveKey);
    } finally {
      restorePromptedRef.current = true;
    }
  }, [autosaveKey]);

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
                <h1 className="text-xl font-bold text-foreground">
                  Create News Post
                </h1>
                <p className="text-sm text-muted-foreground">
                  Share updates with your organization
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDiscardDraft}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                  "border border-destructive/60 text-destructive hover:bg-destructive/10",
                )}
                type="button"
              >
                <Trash2 className="w-4 h-4" />
                <span>Discard Draft</span>
              </button>
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
                  "placeholder:text-muted-foreground",
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
                      "focus:outline-none focus:ring-2 focus:ring-primary",
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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
                    "focus:outline-none focus:ring-2 focus:ring-primary",
                  )}
                />
                <button
                  type="button"
                  className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-all flex items-center gap-2"
                  onClick={() => setShowPreview(true)}
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
                      "focus:outline-none focus:ring-2 focus:ring-primary",
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
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Preview"
        size="xl"
        variant="glass"
      >
        <div className="space-y-6">
          {/* Cover Image */}
          {coverImage ? (
            <div className="rounded-xl overflow-hidden border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coverImage} alt="Cover" className="w-full h-56 object-cover" />
            </div>
          ) : null}

          {/* Title and Meta */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{title || "Untitled post"}</h2>
            {(pinned || featured || tags.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {pinned && (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">📌 Pinned</span>
                )}
                {featured && (
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-600 dark:text-yellow-300 border border-yellow-500/20">✨ Featured</span>
                )}
                {tags.map((tag) => (
                  <NewsChip key={tag} size="sm" variant="outline">{tag}</NewsChip>
                ))}
              </div>
            )}
          </div>

          {/* Content */}
          {content ? (
            <NewsContentTipTapRenderer content={content} className="bg-card rounded-xl p-4 border border-border" minHeight="300px" />
          ) : (
            <div className="p-4 text-sm text-muted-foreground bg-card rounded-xl border border-border">
              Start writing content to see a live preview here.
            </div>
          )}

          {/* Video */}
          {videoUrl && (
            <div>
              <h3 className="text-lg font-semibold mb-3">📹 Video</h3>
              <div className="relative rounded-xl overflow-hidden shadow-lg border border-border">
                <iframe src={videoUrl} className="w-full aspect-video" allowFullScreen />
              </div>
            </div>
          )}

          {/* Attachments */}
          {attachmentItems.filter((i) => i.status === "success" && i.meta?.url).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-3">📎 Attachments</h3>
              <ul className="list-disc list-inside text-sm text-foreground/90 space-y-1">
                {attachmentItems
                  .filter((i) => i.status === "success" && i.meta?.url)
                  .map((i, idx) => (
                    <li key={idx}>
                      <a className="text-primary hover:underline" href={(i.meta as any)?.url ?? "#"} target="_blank" rel="noreferrer">
                        {(i.meta as any)?.name || (i.meta as any)?.path || `Attachment ${idx + 1}`}
                      </a>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
