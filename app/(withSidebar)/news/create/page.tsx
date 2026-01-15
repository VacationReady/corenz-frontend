"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import NewsEditor from "@/components/news/NewsEditor";
import NewsContentTipTapRenderer from "@/components/news/NewsContentTipTapRenderer";
import NewsChip from "@/components/ui/NewsChip";
import AudienceSelector from "@/components/news/AudienceSelector";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
  Image as ImageIcon,
  FileText,
  Settings2,
  Pin,
  Star,
  Mail,
  Save,
  Zap,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
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
  // UI-only cover controls (autosaved locally)
  coverFit?: "cover" | "contain";
  coverHeightPx?: number;
  coverObjectPositionX?: number; // 0-100
  coverObjectPositionY?: number; // 0-100
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
  const tenantFetch = useTenantFetch();
  const router = useRouter();
  const { data: session } = useSession();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState<any>(null);
  const [coverImage, setCoverImage] = useState("");
  const [coverStoragePath, setCoverStoragePath] = useState<string | null>(null);
  const [coverFit, setCoverFit] = useState<"cover" | "contain">("cover");
  const [coverHeightPx, setCoverHeightPx] = useState<number>(280);
  const [coverObjectPositionX, setCoverObjectPositionX] = useState<number>(50);
  const [coverObjectPositionY, setCoverObjectPositionY] = useState<number>(50);
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<
    "draft" | "publish" | null
  >(null);
  const [showPreview, setShowPreview] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cover: true,
    content: true,
    media: false,
    settings: true,
  });
  const [isFullscreenEditor, setIsFullscreenEditor] = useState(false);

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
    coverFit: "cover",
    coverHeightPx: 280,
    coverObjectPositionX: 50,
    coverObjectPositionY: 50,
  });
  const restorePromptedRef = useRef(false);

  const autosaveKey = session?.user
    ? `news:create:${session.user.companyId}:${session.user.id}`
    : null;

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

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
      setCoverFit("cover");
      setCoverHeightPx(280);
      setCoverObjectPositionX(50);
      setCoverObjectPositionY(50);
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

    setIsDraft(asDraft);

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
    const failedCount = attachmentItems.filter((item) => item.status === "error").length;
    
    if (hasFailedAttachments) {
      const shouldProceed = window.confirm(
        `${failedCount} attachment${failedCount > 1 ? 's' : ''} failed to upload. Do you want to proceed without ${failedCount > 1 ? 'them' : 'it'}? Click OK to continue or Cancel to fix the uploads first.`
      );
      if (!shouldProceed) {
        toast.info("Please remove or retry failed attachments, then submit again.");
        return;
      }
      // User chose to proceed - remove failed items from state
      setAttachmentItems(prev => prev.filter(item => item.status !== "error"));
      toast.info(`Proceeding without ${failedCount} failed attachment${failedCount > 1 ? 's' : ''}`);
    }

    const hasUploadingCover = coverItems.some(
      (item) => item.status === "uploading",
    );
    if (hasUploadingCover) {
      toast.error("Please wait for the cover image upload to finish.");
      return;
    }

    const hasFailedCover = coverItems.some((item) => item.status === "error");
    if (hasFailedCover) {
      const shouldProceed = window.confirm(
        "Cover image upload failed. Do you want to proceed without a cover image?"
      );
      if (!shouldProceed) {
        toast.info("Please retry the cover image upload or remove it, then submit again.");
        return;
      }
      // Clear failed cover
      setCoverItems([]);
      setCoverImage("");
      setCoverStoragePath(null);
      toast.info("Proceeding without cover image");
    }

    const uploadedAttachments = attachmentItems
      .filter((item) => item.status === "success" && item.meta)
      .map((item) => item.meta as NewsUploadMeta);

    setIsSubmitting(true);
    setSubmittingAction(asDraft ? "draft" : "publish");

    try {
      const res = await tenantFetch("/api/news", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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

  // Keep latest draft snapshot
  useEffect(() => {
    latestDraftRef.current = {
      title,
      content,
      coverImage,
      coverFit,
      coverHeightPx,
      coverObjectPositionX,
      coverObjectPositionY,
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
    coverFit,
    coverHeightPx,
    coverObjectPositionX,
    coverObjectPositionY,
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
        setCoverFit((parsed as any)?.coverFit === "contain" ? "contain" : "cover");
        setCoverHeightPx(
          typeof (parsed as any)?.coverHeightPx === "number"
            ? Math.min(600, Math.max(120, (parsed as any).coverHeightPx))
            : 280,
        );
        setCoverObjectPositionX(
          typeof (parsed as any)?.coverObjectPositionX === "number"
            ? Math.min(100, Math.max(0, (parsed as any).coverObjectPositionX))
            : 50,
        );
        setCoverObjectPositionY(
          typeof (parsed as any)?.coverObjectPositionY === "number"
            ? Math.min(100, Math.max(0, (parsed as any).coverObjectPositionY))
            : 50,
        );
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
                onClick={() => router.push("/news")}
                className="p-2.5 hover:bg-muted rounded-xl transition-all"
                type="button"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
              <div>
                <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500" />
                  Create Story
                </h1>
                <p className="text-sm text-muted-foreground">
                Share updates with your organisation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDiscardDraft}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  "text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20",
                )}
                type="button"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Discard</span>
              </motion.button>
              
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
                onClick={(e) => handleSubmit(e, true)}
                disabled={isSubmitting}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                  "bg-muted/50 hover:bg-muted disabled:opacity-50"
                )}
                type="button"
              >
                {isSubmitting && submittingAction === "draft" ? (
                  <div className="w-4 h-4 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">Save Draft</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={(e) => handleSubmit(e, false)}
                disabled={isSubmitting}
                className={cn(
                  "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all",
                  "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 text-white",
                  "shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                type="button"
              >
                {isSubmitting && submittingAction === "publish" ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                <span>Publish</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

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
                placeholder="Write a compelling headline that captures attention..."
                className={cn(
                  "w-full px-0 py-2 text-2xl lg:text-3xl font-bold",
                  "bg-transparent border-none",
                  "focus:outline-none focus:ring-0",
                  "placeholder:text-muted-foreground/50",
                )}
                required
              />
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <span className={title.length > 100 ? "text-amber-500" : ""}>
                  {title.length} characters
                </span>
                {title.length > 100 && (
                  <span className="text-amber-500">• Consider a shorter title for better engagement</span>
                )}
              </div>
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
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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

                          {coverFit === "cover" && (
                            <>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                  Position X: {coverObjectPositionX}%
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={coverObjectPositionX}
                                  onChange={(e) => setCoverObjectPositionX(parseInt(e.target.value, 10))}
                                  className="w-full accent-primary"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                  Position Y: {coverObjectPositionY}%
                                </label>
                                <input
                                  type="range"
                                  min={0}
                                  max={100}
                                  value={coverObjectPositionY}
                                  onChange={(e) => setCoverObjectPositionY(parseInt(e.target.value, 10))}
                                  className="w-full accent-primary"
                                />
                              </div>
                            </>
                          )}
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
                          helperText="Recommended: 1200x630px for best social sharing"
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
                  <span className="text-destructive">*</span>
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
                  placeholder="Start writing your story... Type / for commands"
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
              <SectionHeader title="Media & Attachments" icon={Video} section="media" />
              
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
                      <div className="flex gap-3">
                        <input
                          type="url"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="Paste YouTube or Vimeo URL..."
                          className={cn(
                            "flex-1 px-4 py-3 text-sm",
                            "bg-background border border-border rounded-xl",
                            "focus:outline-none focus:ring-2 focus:ring-primary",
                          )}
                        />
                      </div>
                    </div>

                    {/* Attachments */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-foreground">File Attachments</label>
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
                          <p className="text-xs text-muted-foreground">Send to audience</p>
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
          {(!title.trim() || !content) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40"
            >
              <div className="flex items-center gap-3 px-5 py-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl backdrop-blur-sm shadow-lg">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  {!title.trim() ? "Add a headline" : "Add some content"} to publish
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Preview"
        size="xl"
        variant="glass"
      >
        <div className="space-y-6 max-h-[70vh] overflow-y-auto">
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

            {content ? (
              <NewsContentTipTapRenderer
                content={content}
                className="prose dark:prose-invert"
              />
            ) : (
              <p className="text-muted-foreground italic">
                Start writing to see your content here...
              </p>
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
      </Modal>
    </div>
  );
}
