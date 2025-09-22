"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { uploadFileToSupabase } from "@/lib/news/uploadFileToSupabase";
import NewsEditor from "@/components/news/NewsEditor";
import AudienceCampaignPanel from "@/components/news/AudienceCampaignPanel";
import NewsChip from "@/components/ui/NewsChip";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  Upload,
  Image,
  Video,
  FileText,
  X,
  Plus,
  Hash,
  Sparkles,
  Eye,
  Clock,
  AlertCircle,
  Trash2,
} from "lucide-react";

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

const hasMeaningfulDraft = (
  draft: NewsDraftPayload | null | undefined,
) => {
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

export default function CreateNewsPostPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [coverImage, setCoverImage] = useState("");
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
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
  const [showPreview, setShowPreview] = useState(false);
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
      setAttachments([]);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleCoverFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingCover(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/news/cover-upload", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(errText || "Upload failed");
      }
      const data = await res.json();
      setCoverImage(data.url || "");
      toast.success("Cover image uploaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload cover image");
    } finally {
      setIsUploadingCover(false);
      if (coverFileInputRef.current) coverFileInputRef.current.value = "";
    }
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

  const handleSubmit = async (e: React.FormEvent, asDraft = false) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsDraft(asDraft);
    setIsSubmitting(true);

    try {
      // Upload attachments
      const uploadedUrls = await Promise.all(
        attachments.map((file) => uploadFileToSupabase(file))
      );

      const res = await fetch("/api/news", {
        method: "POST",
        body: JSON.stringify({
          title,
          content,
          coverImage: normalizeCoverForSave(coverImage) || null,
          videoEmbedUrl: videoUrl || null,
          attachments: uploadedUrls,
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
  }, [title, content, coverImage, videoUrl, tags, pinned, featured, sendEmail, audience, isDraft]);

  useEffect(() => {
    restorePromptedRef.current = false;
  }, [autosaveKey]);

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
        ? `A locally saved draft from ${new Date(parsed.updatedAt).toLocaleString()} was found. Restore it?`
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
        setAttachments([]);
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
                <h1 className="text-xl font-bold text-foreground">Create News Post</h1>
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
              <button
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all",
                  "border border-border hover:bg-muted",
                  showPreview && "bg-muted"
                )}
                type="button"
              >
                <Eye className="w-4 h-4" />
                <span>Preview</span>
              </button>
              <button
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-all disabled:opacity-50"
                type="button"
              >
                <Clock className="w-4 h-4" />
                <span>Save Draft</span>
              </button>
              <button
                onClick={(e) => handleSubmit(e, false)}
                disabled={isSubmitting}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all",
                  "bg-gradient-to-r from-editorial-purple to-editorial-blue text-white",
                  "hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100"
                )}
                type="submit"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Publish Now</span>
                  </>
                )}
              </button>
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
              <div className="flex gap-3">
                <input
                  type="url"
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className={cn(
                    "flex-1 px-4 py-2",
                    "bg-card border border-border rounded-lg",
                    "focus:outline-none focus:ring-2 focus:ring-primary"
                  )}
                />
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className={cn(
                    "px-4 py-2 rounded-lg transition-all flex items-center gap-2",
                    "bg-muted hover:bg-muted/80",
                    isUploadingCover && "opacity-60 cursor-not-allowed"
                  )}
                >
                  <Image className="w-4 h-4" />
                  {isUploadingCover ? "Uploading..." : "Upload"}
                </button>
              </div>
              <input
                ref={coverFileInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverFileChange}
                className="hidden"
              />
              {coverImage && (
                <div className="relative mt-2 rounded-lg overflow-hidden">
                  <img
                    src={coverImage}
                    alt="Cover"
                    className="w-full h-48 object-cover"
                  />
                  <button
                    onClick={() => setCoverImage("")}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
                    type="button"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
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
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PDF, DOC, XLS, PPT up to 10MB each
                  </span>
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="grid gap-2 mt-3">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="p-1 hover:bg-muted rounded-lg"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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