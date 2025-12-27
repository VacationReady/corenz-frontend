"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { Switch } from "@/components/ui/switch";
import { uploadFileToSupabase } from "@/lib/news/uploadFileToSupabase";
import dynamic from "next/dynamic";
import AudienceSelector from "@/components/news/AudienceSelector";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import NewsChip from "@/components/ui/NewsChip";
import FileDropzone, {
  FileDropzoneItem,
  UploadHelpers,
} from "@/components/ui/FileDropzone";
import {
  ArrowLeft,
  Save,
  Trash2,
  X,
  Plus,
  Hash,
  Sparkles,
  Eye,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Settings2,
  Video,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Loader2,
  Pin,
  Star,
  Mail,
  RefreshCw,
  Zap,
} from "lucide-react";

const NewsEditor = dynamic(
  () => import("@/components/news/NewsEditor"),
  { ssr: false },
);

const NewsContentTipTapRenderer = dynamic(
  () => import("@/components/news/NewsContentTipTapRenderer"),
  { ssr: false },
);

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

export default function EditNewsPostPage() {
  const tenantFetch = useTenantFetch();
  const params = useParams();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : (params?.slug as string);
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [coverImage, setCoverImage] = useState("");
  const [coverStoragePath, setCoverStoragePath] = useState<string | null>(null);
  const [coverFit, setCoverFit] = useState<"cover" | "contain">("cover");
  const [coverHeightPx, setCoverHeightPx] = useState<number>(280);
  const [coverObjectPositionX, setCoverObjectPositionX] = useState<number>(50);
  const [coverObjectPositionY, setCoverObjectPositionY] = useState<number>(50);
  const [videoUrl, setVideoUrl] = useState("");
  const [attachmentItems, setAttachmentItems] = useState<FileDropzoneItem<NewsUploadMeta>[]>([]);
  const [coverItems, setCoverItems] = useState<FileDropzoneItem<NewsUploadMeta>[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [audience, setAudience] = useState<{
    type?: "all";
    departments?: string[];
    roles?: string[];
    locations?: string[];
  }>({ type: "all" });
  
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cover: true,
    content: true,
    media: false,
    settings: true,
  });
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) return router.push("/news");

    async function fetchPost() {
      try {
        const res = await tenantFetch(`/api/news/${slug}`);
        if (!res.ok) return router.push("/news");

        const post = await res.json();
        if (!post) return router.push("/news");

        const isAdmin =
          session?.user?.role === "ADMIN" ||
          session?.user?.role === "SUPER_ADMIN";
        const isAuthor = session?.user?.id === post.authorId;

        if (!isAdmin && !isAuthor) return router.push("/news");

        setTitle(post.title);
        
        // Handle content - could be TipTap JSON or old format
        if (post.content) {
          if (typeof post.content === "object" && post.content.type === "doc") {
            setContent(post.content);
          } else if (Array.isArray(post.content)) {
            setContent(post.content);
          } else if (typeof post.content === "string") {
            try {
              const parsed = JSON.parse(post.content);
              setContent(parsed);
            } catch {
              setContent({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: post.content }] }] });
            }
          }
        }
        
        setCoverImage(post.coverImage || post.coverImageUrl || "");
        setVideoUrl(post.videoEmbedUrl || "");
        setPinned(post.pinned || false);
        setFeatured(post.featured || false);
        setTags(post.tags || []);
        setIsDraft(!post.publishedAt);

        const normalizedAttachments = Array.isArray(post.attachments)
          ? post.attachments
          : typeof post.attachments === "string"
            ? [post.attachments]
            : [];
        setExistingFiles(normalizedAttachments);
        setSendEmail(post.sendEmail || false);
        setAudience(post.audience || { type: "all" });
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch post:", error);
        toast.error("Failed to load post");
        router.push("/news");
      }
    }

    fetchPost();
  }, [slug, router, session, status, tenantFetch]);

  useEffect(() => {
    const successful = coverItems.find(
      (item) => item.status === "success" && item.meta,
    );
    if (successful?.meta) {
      const meta = successful.meta as NewsUploadMeta;
      setCoverStoragePath(meta.path);
      setCoverImage(meta.url || meta.path || "");
    }
  }, [coverItems]);

  const handleCoverUpload = (
    file: File,
    helpers: UploadHelpers,
  ): Promise<NewsUploadMeta> =>
    uploadWithProgress(
      "/api/news/cover-upload",
      file,
      helpers,
    ) as Promise<NewsUploadMeta>;

  const handleAttachmentUpload = (
    file: File,
    helpers: UploadHelpers,
  ): Promise<NewsUploadMeta> =>
    uploadWithProgress(
      "/api/news/attachment-upload",
      file,
      helpers,
    ) as Promise<NewsUploadMeta>;

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
      toast.error("Please enter a title");
      return false;
    }
    return true;
  };

  function normalizeCoverForSave(input: string | null | undefined) {
    if (!input) return "";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    const hasUploadingAttachments = attachmentItems.some(
      (item) => item.status === "uploading",
    );
    if (hasUploadingAttachments) {
      toast.error("Please wait for attachments to finish uploading.");
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
      .map((item) => (item.meta as NewsUploadMeta).url || (item.meta as NewsUploadMeta).path);

    setSaving(true);

    try {
      const res = await tenantFetch(`/api/news/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          coverImage: normalizeCoverForSave(coverStoragePath || coverImage) || null,
          videoEmbedUrl: videoUrl || null,
          attachments: [...existingFiles, ...uploadedAttachments],
          sendEmail,
          audience,
          tags,
          pinned,
          featured,
        }),
      });

      if (res.ok) {
        toast.success("Post updated successfully!");
        router.push(`/news/${slug}`);
      } else {
        const error = await res.text();
        toast.error(`Failed to update: ${error}`);
      }
    } catch (error) {
      toast.error("An error occurred while updating");
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validateForm()) return;

    const hasUploadingAttachments = attachmentItems.some(
      (item) => item.status === "uploading",
    );
    if (hasUploadingAttachments) {
      toast.error("Please wait for attachments to finish uploading.");
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
      .map((item) => (item.meta as NewsUploadMeta).url || (item.meta as NewsUploadMeta).path);

    setPublishing(true);

    try {
      const res = await tenantFetch(`/api/news/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          coverImage: normalizeCoverForSave(coverStoragePath || coverImage) || null,
          videoEmbedUrl: videoUrl || null,
          attachments: [...existingFiles, ...uploadedAttachments],
          sendEmail,
          audience,
          tags,
          pinned,
          featured,
          publishedAt: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        toast.success("Post published successfully!");
        router.push(`/news/${slug}`);
      } else {
        const error = await res.text();
        toast.error(`Failed to publish: ${error}`);
      }
    } catch (error) {
      toast.error("An error occurred while publishing");
      console.error(error);
    } finally {
      setPublishing(false);
    }
  };

  // Section Header Component
  const SectionHeader = ({ 
    title, 
    icon: Icon, 
    section, 
    badge 
  }: { 
    title: string; 
    icon: React.ElementType; 
    section: string;
    badge?: string;
  }) => (
    <button
      type="button"
      onClick={() => toggleSection(section)}
      className={cn(
        "w-full flex items-center justify-between p-4 rounded-xl transition-all",
        "hover:bg-muted/50",
        expandedSections[section] ? "bg-muted/30" : ""
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg",
          expandedSections[section] 
            ? "bg-primary/10 text-primary" 
            : "bg-muted text-muted-foreground"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-semibold text-foreground">{title}</span>
        {badge && (
          <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full">
            {badge}
          </span>
        )}
      </div>
      {expandedSections[section] ? (
        <ChevronUp className="w-4 h-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      )}
    </button>
  );

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full blur-xl opacity-30 animate-pulse" />
            <div className="relative p-4 bg-card rounded-2xl border border-border/50">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          </div>
          <p className="text-muted-foreground font-medium">Loading post...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push(isDraft ? "/news" : `/news/${slug}`)}
                className="p-2.5 hover:bg-muted rounded-xl transition-all"
                type="button"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-blue-500" />
                  {isDraft ? "Edit Draft" : "Edit Story"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isDraft ? "Continue editing your draft" : "Update your news post"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowPreview(!showPreview)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  showPreview 
                    ? "bg-primary/10 text-primary border border-primary/30" 
                    : "bg-muted/50 hover:bg-muted"
                )}
                type="button"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">Preview</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={saving || publishing}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  "bg-muted/50 hover:bg-muted",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                type="button"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{isDraft ? "Save Draft" : "Save Changes"}</span>
              </motion.button>

              {isDraft && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handlePublish}
                  disabled={saving || publishing}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white",
                    "shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  type="button"
                >
                  {publishing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  <span>Publish</span>
                </motion.button>
              )}

              {!isDraft && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={saving || publishing}
                  className={cn(
                    "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                    "bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 text-white",
                    "shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                  type="button"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Save Changes</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <form
        onSubmit={handleSubmit}
        className="max-w-7xl mx-auto px-6 py-8"
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.preventDefault();
          }
        }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8">
          {/* Main Content Area */}
          <div className="space-y-6">
            {/* Title Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 p-6"
            >
              <label className="block text-sm font-medium text-foreground mb-3">
                Headline <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Write a compelling headline..."
                className={cn(
                  "w-full px-0 py-2 text-2xl lg:text-3xl font-bold",
                  "bg-transparent border-none",
                  "focus:outline-none focus:ring-0",
                  "placeholder:text-muted-foreground/50",
                )}
                required
              />
            </motion.div>

            {/* Cover Image Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden"
            >
              <SectionHeader title="Cover Image" icon={ImageIcon} section="cover" />
              
              <AnimatePresence>
                {expandedSections.cover && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6 space-y-4"
                  >
                    {coverImage ? (
                      <div className="space-y-4">
                        <div
                          className="relative rounded-xl overflow-hidden bg-muted group"
                          style={{ height: `${coverHeightPx}px` }}
                        >
                          <img
                            src={coverImage}
                            alt="Cover"
                            className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                            style={{
                              objectFit: coverFit,
                              objectPosition: `${coverObjectPositionX}% ${coverObjectPositionY}%`,
                            }}
                          />
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={clearCover}
                            className="absolute top-3 right-3 p-2 rounded-xl bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        </div>

                        {/* Cover Controls */}
                        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl">
                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Fit Mode</label>
                            <select
                              value={coverFit}
                              onChange={(e) => setCoverFit(e.target.value as any)}
                              className="w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="cover">Cover (Crop)</option>
                              <option value="contain">Contain (Fit)</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                              Height: {coverHeightPx}px
                            </label>
                            <input
                              type="range"
                              min={120}
                              max={500}
                              step={10}
                              value={coverHeightPx}
                              onChange={(e) => setCoverHeightPx(parseInt(e.target.value, 10))}
                              className="w-full accent-primary"
                            />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex gap-3">
                          <input
                            type="url"
                            value={coverImage}
                            onChange={(e) => {
                              setCoverImage(e.target.value);
                              setCoverStoragePath(null);
                              if (coverItems.length) setCoverItems([]);
                            }}
                            placeholder="Paste image URL or upload below..."
                            className={cn(
                              "flex-1 px-4 py-3 text-sm",
                              "bg-background border border-border rounded-xl",
                              "focus:outline-none focus:ring-2 focus:ring-primary",
                            )}
                          />
                        </div>
                        <FileDropzone
                          files={coverItems}
                          onFilesChange={setCoverItems}
                          onUpload={handleCoverUpload}
                          multiple={false}
                          accept="image/*"
                          description="Drag & drop a hero image or click to browse"
                          helperText="Recommended: 1200x630px"
                        />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Content Editor */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={cn(
                "bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden",
                isFullscreenEditor && "fixed inset-4 z-50 bg-card"
              )}
            >
              <div className="flex items-center justify-between p-4 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-foreground">Content</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFullscreenEditor(!isFullscreenEditor)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  {isFullscreenEditor ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className={cn(
                "overflow-hidden",
                isFullscreenEditor ? "h-[calc(100%-60px)]" : ""
              )}>
                <NewsEditor
                  value={content}
                  onChange={setContent}
                  placeholder="Edit your story content..."
                  minHeight={isFullscreenEditor ? "100%" : "500px"}
                />
              </div>
            </motion.div>

            {/* Media Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden"
            >
              <SectionHeader 
                title="Media & Attachments" 
                icon={Video} 
                section="media"
                badge={existingFiles.length > 0 ? `${existingFiles.length} files` : undefined}
              />
              
              <AnimatePresence>
                {expandedSections.media && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6 space-y-6"
                  >
                    {/* Video Embed */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">Video Embed</label>
                      <input
                        type="url"
                        value={videoUrl}
                        onChange={(e) => setVideoUrl(e.target.value)}
                        placeholder="Paste YouTube or Vimeo URL..."
                        className={cn(
                          "w-full px-4 py-3 text-sm",
                          "bg-background border border-border rounded-xl",
                          "focus:outline-none focus:ring-2 focus:ring-primary",
                        )}
                      />
                    </div>

                    {/* Existing Files */}
                    {existingFiles.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-foreground">Existing Attachments</label>
                        <div className="space-y-2">
                          {existingFiles.map((url, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-3 bg-muted/30 rounded-xl"
                            >
                              <span className="text-sm text-foreground truncate flex-1">
                                {url.split("/").pop()}
                              </span>
                              <button
                                type="button"
                                onClick={() => setExistingFiles(existingFiles.filter((_, idx) => idx !== i))}
                                className="p-1.5 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Attachments */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">Add New Attachments</label>
                      <FileDropzone
                        files={attachmentItems}
                        onFilesChange={setAttachmentItems}
                        onUpload={handleAttachmentUpload}
                        accept={[".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", "image/*"]}
                        description="Drag & drop files or click to browse"
                        helperText="PDF, Word, Excel, PowerPoint, or images"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Tags Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl p-6 border border-border/50"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-violet-500/10 text-violet-500">
                  <Hash className="w-4 h-4" />
                </div>
                <h3 className="font-semibold text-foreground">Tags</h3>
              </div>
              <div className="space-y-4">
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
                      "flex-1 px-4 py-2.5 text-sm",
                      "bg-background border border-border rounded-xl",
                      "focus:outline-none focus:ring-2 focus:ring-primary",
                    )}
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddTag}
                    type="button"
                    className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4" />
                  </motion.button>
                </div>
                {tags.length > 0 && (
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
                )}
              </div>
            </motion.div>

            {/* Post Settings */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden"
            >
              <SectionHeader 
                title="Settings" 
                icon={Settings2} 
                section="settings"
                badge={(pinned || featured || sendEmail) ? "Active" : undefined}
              />
              
              <AnimatePresence>
                {expandedSections.settings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-6 pb-6 space-y-4"
                  >
                    <label className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                          <Pin className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">Pin Post</p>
                          <p className="text-xs text-muted-foreground">Keep at top of feed</p>
                        </div>
                      </div>
                      <Switch checked={pinned} onChange={setPinned} />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-fuchsia-500/10 text-fuchsia-500">
                          <Star className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">Feature Post</p>
                          <p className="text-xs text-muted-foreground">Show in hero section</p>
                        </div>
                      </div>
                      <Switch checked={featured} onChange={setFeatured} />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">Email Notification</p>
                          <p className="text-xs text-muted-foreground">Resend to audience</p>
                        </div>
                      </div>
                      <Switch checked={sendEmail} onChange={setSendEmail} />
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Audience Selector */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card/60 backdrop-blur-sm rounded-2xl p-6 border border-border/50"
            >
              <AudienceSelector
                value={audience}
                onChange={setAudience}
                refreshKey={0}
              />
            </motion.div>
          </div>
        </div>

        {/* Validation Warning */}
        <AnimatePresence>
          {!title.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl backdrop-blur-sm shadow-lg">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Add a headline to save changes
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Preview Panel */}
      <AnimatePresence>
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ type: "spring", damping: 25 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-card border-l border-border z-50 overflow-y-auto"
          >
            <div className="sticky top-0 bg-card/80 backdrop-blur-xl border-b border-border p-4 flex items-center justify-between">
              <h2 className="font-semibold text-foreground">Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {coverImage && (
                <div className="rounded-xl overflow-hidden" style={{ height: `${coverHeightPx}px` }}>
                  <img
                    src={coverImage}
                    alt="Cover"
                    className="w-full h-full"
                    style={{
                      objectFit: coverFit,
                      objectPosition: `${coverObjectPositionX}% ${coverObjectPositionY}%`,
                    }}
                  />
                </div>
              )}

              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {pinned && (
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-600 text-xs font-medium rounded-full">
                      📌 Pinned
                    </span>
                  )}
                  {featured && (
                    <span className="px-3 py-1 bg-fuchsia-500/10 text-fuchsia-600 text-xs font-medium rounded-full">
                      ✨ Featured
                    </span>
                  )}
                  {tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>

                <h2 className="text-2xl font-bold text-foreground">
                  {title || "Untitled Post"}
                </h2>

                {content && (
                  <NewsContentTipTapRenderer
                    content={content}
                    className="prose dark:prose-invert"
                  />
                )}

                {videoUrl && (
                  <div className="rounded-xl overflow-hidden">
                    <iframe
                      src={videoUrl}
                      className="w-full aspect-video"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
