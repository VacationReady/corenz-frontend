"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { format, formatDistanceToNow } from "date-fns";
import NewsContentRenderer from "./NewsContentRenderer";
import NewsContentTipTapRenderer from "./NewsContentTipTapRenderer";
import DeleteNewsButton from "./DeleteNewsButton";
import NewsSpotlightCard from "./NewsSpotlightCard";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Edit,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  User,
  Calendar,
  Users,
  MapPin,
  Building,
  ChevronRight,
  Twitter,
  Linkedin,
  Facebook,
  Link as LinkIcon,
  Mail,
  Sparkles,
  FileText,
  Download,
  ExternalLink,
  ArrowUp,
  Copy,
  Check,
  MoreHorizontal,
} from "lucide-react";

interface NewsDetailClientProps {
  post: {
    id: string;
    title: string;
    slug: string;
    content: any;
    coverImage?: string | null;
    videoEmbedUrl?: string | null;
    attachments: string[];
    audience?: {
      type?: "all";
      departments?: string[];
      roles?: string[];
      locations?: string[];
    };
    author: {
      id: string;
      name: string | null;
      email: string;
      avatar?: string | null;
      role?: string;
    };
    tags: string[];
    pinned: boolean;
    featured?: boolean;
    publishedAt: Date | string | null;
    createdAt: Date | string;
    readTime?: number;
    views?: number;
    reactions?: Record<string, number>;
    bookmarkCount?: number;
    isBookmarked?: boolean;
    userReaction?: string | null;
  };
  relatedPosts?: Array<{
    id: string;
    title: string;
    slug: string;
    coverImage?: string | null;
    author: {
      name: string | null;
      email: string;
      avatar?: string | null;
    };
    publishedAt: Date | string | null;
    tags: string[];
  }>;
  canEdit: boolean;
  currentUserId?: string;
}

const shareOptions = [
  { id: "twitter", icon: Twitter, label: "Twitter", color: "hover:bg-sky-500/10 hover:text-sky-500" },
  { id: "linkedin", icon: Linkedin, label: "LinkedIn", color: "hover:bg-blue-600/10 hover:text-blue-600" },
  { id: "facebook", icon: Facebook, label: "Facebook", color: "hover:bg-blue-700/10 hover:text-blue-700" },
  { id: "email", icon: Mail, label: "Email", color: "hover:bg-amber-500/10 hover:text-amber-500" },
  { id: "link", icon: Copy, label: "Copy Link", color: "hover:bg-emerald-500/10 hover:text-emerald-500" },
];

const reactionEmojis = [
  { id: "like", emoji: "👍", label: "Like" },
  { id: "heart", emoji: "❤️", label: "Love" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "clap", emoji: "👏", label: "Clap" },
  { id: "thinking", emoji: "🤔", label: "Thinking" },
  { id: "celebrate", emoji: "🎉", label: "Celebrate" },
];

export default function NewsDetailClient({
  post,
  relatedPosts = [],
  canEdit,
  currentUserId,
}: NewsDetailClientProps) {
  const tenantFetch = useTenantFetch();
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const [viewCount, setViewCount] = useState(post.views ?? 0);
  const [reactions, setReactions] = useState<Record<string, number>>(post.reactions ?? {});
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmarkCount ?? 0);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked ?? false);
  const [userReaction, setUserReaction] = useState<string | null>(post.userReaction ?? null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [readProgress, setReadProgress] = useState(0);

  // Scroll progress
  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 200], [0, 1]);

  // Track reading progress
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      
      const contentTop = contentRef.current.offsetTop;
      const contentHeight = contentRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      
      const progress = Math.min(
        100,
        Math.max(0, ((scrollTop - contentTop + windowHeight) / contentHeight) * 100)
      );
      setReadProgress(progress);
      setShowScrollTop(scrollTop > 500);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Track view
  useEffect(() => {
    let isCancelled = false;

    const trackView = async () => {
      try {
        const response = await tenantFetch(`/api/news/${post.slug}/view`, {
          method: "POST",
        });

        if (!response.ok) return;
        const data = await response.json();
        if (!isCancelled && typeof data.viewCount === "number") {
          setViewCount(data.viewCount);
        }
      } catch (error) {
        // Silently ignore tracking failures
      }
    };

    trackView();

    return () => {
      isCancelled = true;
    };
  }, [post.slug, tenantFetch]);

  const handleShare = async (platform: string) => {
    const url = window.location.href;
    const title = post.title;

    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
          "_blank"
        );
        break;
      case "linkedin":
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
          "_blank"
        );
        break;
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
          "_blank"
        );
        break;
      case "email":
        window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(`Check out this article: ${url}`)}`;
        break;
      case "link":
        await navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
        toast.success("Link copied to clipboard!");
        break;
    }
    setShowShareMenu(false);
  };

  const handleReaction = async (reactionId: string) => {
    const previousReaction = userReaction;
    const previousReactions = reactions;
    const isRemoving = previousReaction === reactionId;

    const optimisticReactions = { ...previousReactions };
    if (previousReaction) {
      optimisticReactions[previousReaction] = Math.max(
        (optimisticReactions[previousReaction] ?? 1) - 1,
        0,
      );
    }
    if (!isRemoving) {
      optimisticReactions[reactionId] = (optimisticReactions[reactionId] ?? 0) + 1;
    }

    setUserReaction(isRemoving ? null : reactionId);
    setReactions(optimisticReactions);
    setShowReactions(false);

    try {
      const response = await tenantFetch(`/api/news/${post.slug}/reaction`, {
        method: isRemoving ? "DELETE" : "POST",
        headers: isRemoving ? undefined : { "Content-Type": "application/json" },
        body: isRemoving ? undefined : JSON.stringify({ reaction: reactionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update reaction");
      }

      const data = await response.json();
      setReactions(data.reactions ?? {});
      setUserReaction(data.userReaction ?? null);

      toast.success(
        data.userReaction
          ? `You reacted with ${reactionEmojis.find((r) => r.id === data.userReaction)?.emoji ?? ""}`
          : "Reaction removed",
      );
    } catch (error) {
      setUserReaction(previousReaction ?? null);
      setReactions(previousReactions);
      toast.error("Unable to update your reaction. Please try again.");
    }
  };

  const handleBookmarkToggle = async () => {
    const previousState = isBookmarked;
    const previousCount = bookmarkCount;

    setIsBookmarked(!previousState);
    setBookmarkCount(previousState ? Math.max(previousCount - 1, 0) : previousCount + 1);

    try {
      const response = await tenantFetch(`/api/news/${post.slug}/bookmark`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle bookmark");
      }

      const data = await response.json();
      setIsBookmarked(Boolean(data.isBookmarked));
      if (typeof data.bookmarkCount === "number") {
        setBookmarkCount(data.bookmarkCount);
      }

      toast.success(data.isBookmarked ? "Added to bookmarks" : "Removed from bookmarks");
    } catch (error) {
      setIsBookmarked(previousState);
      setBookmarkCount(previousCount);
      toast.error("Unable to update bookmarks. Please try again.");
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getAuthorName = () =>
    post.author?.name || post.author?.email?.split("@")[0] || "Unknown Author";

  const totalReactions = Object.values(reactions).reduce((a, b) => (a || 0) + (b || 0), 0);

  // File type icon helper
  const getFileIcon = (url: string) => {
    const ext = url.split(".").pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      pdf: "📄",
      doc: "📝",
      docx: "📝",
      xls: "📊",
      xlsx: "📊",
      ppt: "📑",
      pptx: "📑",
      zip: "🗂️",
      rar: "🗂️",
    };
    return iconMap[ext || ""] || "📎";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted/30 z-50">
        <motion.div
          className="h-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500"
          style={{ width: `${readProgress}%` }}
          initial={{ width: 0 }}
        />
      </div>

      {/* Floating Header (appears on scroll) */}
      <motion.header
        style={{ opacity: headerOpacity }}
        className="fixed top-0 left-0 right-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/news")}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-sm font-medium text-foreground line-clamp-1 max-w-md">
              {post.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{Math.round(readProgress)}% read</span>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <div className="relative">
        {/* Cover Image or Gradient */}
        <div className="relative h-[500px] lg:h-[600px] overflow-hidden">
          {post.coverImage ? (
            <>
              <motion.img
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-violet-600 via-fuchsia-600 to-pink-600">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50" />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
            </div>
          )}

          {/* Navigation */}
          <div className="absolute top-6 left-0 right-0 z-20">
            <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/news")}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm",
                  "bg-white/10 backdrop-blur-md text-white hover:bg-white/20",
                  "border border-white/20 transition-all"
                )}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to News</span>
              </motion.button>

              {canEdit && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-2"
                >
                  <Link href={`/news/${post.slug}/edit`}>
                    <button className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm",
                      "bg-white/10 backdrop-blur-md text-white hover:bg-white/20",
                      "border border-white/20 transition-all"
                    )}>
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </Link>
                  <DeleteNewsButton slug={post.slug} variant="icon" />
                </motion.div>
              )}
            </div>
          </div>

          {/* Title Section */}
          <div className="absolute bottom-0 left-0 right-0 pb-12">
            <div className="max-w-5xl mx-auto px-6">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="space-y-6"
              >
                {/* Tags */}
                <div className="flex flex-wrap items-center gap-2">
                  {post.pinned && (
                    <span className="px-3 py-1.5 bg-amber-500/90 text-amber-950 text-xs font-bold rounded-full shadow-lg">
                      📌 PINNED
                    </span>
                  )}
                  {post.featured && (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold rounded-full shadow-lg">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      FEATURED
                    </span>
                  )}
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-white/10 backdrop-blur-sm text-white/90 text-xs font-medium rounded-full border border-white/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Title */}
                <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight tracking-tight max-w-4xl">
                  {post.title}
                </h1>

                {/* Meta */}
                <div className="flex flex-wrap items-center gap-4 text-white/70">
                  <div className="flex items-center gap-3">
                    {post.author.avatar ? (
                      <img
                        src={post.author.avatar}
                        alt={getAuthorName()}
                        className="w-12 h-12 rounded-full border-2 border-white/30"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                        <User className="w-6 h-6 text-white/70" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-white">{getAuthorName()}</p>
                      {post.author.role && (
                        <p className="text-sm text-white/60">{post.author.role}</p>
                      )}
                    </div>
                  </div>
                  <span className="w-1 h-1 rounded-full bg-white/30 hidden sm:block" />
                  {post.publishedAt && (
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{format(new Date(post.publishedAt), "MMMM dd, yyyy")}</span>
                    </div>
                  )}
                  <span className="w-1 h-1 rounded-full bg-white/30 hidden sm:block" />
                  {post.readTime && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      <span>{post.readTime} min read</span>
                    </div>
                  )}
                  <span className="w-1 h-1 rounded-full bg-white/30 hidden sm:block" />
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-4 h-4" />
                    <span>{viewCount.toLocaleString()} views</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Reactions */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowReactions(!showReactions)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all",
                    userReaction
                      ? "bg-primary/10 text-primary border border-primary/30"
                      : "bg-muted/50 hover:bg-muted border border-transparent"
                  )}
                >
                  {userReaction ? (
                    <span className="text-lg">
                      {reactionEmojis.find((r) => r.id === userReaction)?.emoji}
                    </span>
                  ) : (
                    <Heart className="w-4 h-4" />
                  )}
                  <span>{totalReactions || "React"}</span>
                </motion.button>

                <AnimatePresence>
                  {showReactions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute top-full mt-2 left-0 bg-card rounded-2xl shadow-2xl border border-border p-2 flex gap-1 z-50"
                    >
                      {reactionEmojis.map((reaction) => (
                        <motion.button
                          key={reaction.id}
                          whileHover={{ scale: 1.2, y: -4 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleReaction(reaction.id)}
                          className={cn(
                            "p-2.5 rounded-xl transition-colors",
                            userReaction === reaction.id ? "bg-primary/20" : "hover:bg-muted"
                          )}
                          title={reaction.label}
                        >
                          <span className="text-2xl">{reaction.emoji}</span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Share */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-muted/50 hover:bg-muted font-medium text-sm transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </motion.button>

                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: 10 }}
                      className="absolute top-full mt-2 left-0 bg-card rounded-2xl shadow-2xl border border-border p-2 w-56 z-50"
                    >
                      {shareOptions.map((option) => {
                        const Icon = option.icon;
                        const isCopyLink = option.id === "link";
                        return (
                          <motion.button
                            key={option.id}
                            whileHover={{ x: 4 }}
                            onClick={() => handleShare(option.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                              option.color
                            )}
                          >
                            {isCopyLink && copiedLink ? (
                              <Check className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <Icon className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">
                              {isCopyLink && copiedLink ? "Copied!" : option.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bookmark */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleBookmarkToggle}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all",
                isBookmarked
                  ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
                  : "bg-muted/50 hover:bg-muted border border-transparent"
              )}
            >
              <Bookmark className={cn("w-4 h-4", isBookmarked && "fill-current")} />
              <span>{isBookmarked ? "Saved" : "Save"}</span>
              {bookmarkCount > 0 && (
                <span className="px-1.5 py-0.5 bg-muted rounded-md text-xs">
                  {bookmarkCount}
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-6 py-12" ref={contentRef}>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-12">
          {/* Article Content */}
          <motion.article
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-8"
          >
            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:font-bold prose-headings:tracking-tight prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline">
              {post?.content && typeof post.content === "object" && post.content?.type && post.content?.content ? (
                <NewsContentTipTapRenderer content={post.content} />
              ) : (
                <NewsContentRenderer content={post.content || []} />
              )}
            </div>

            {/* Video Embed */}
            {post.videoEmbedUrl && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <span className="text-2xl">📹</span>
                  Video Content
                </h3>
                <div className="relative rounded-2xl overflow-hidden shadow-xl border border-border">
                  <iframe
                    src={post.videoEmbedUrl}
                    className="w-full aspect-video"
                    allowFullScreen
                  />
                </div>
              </motion.div>
            )}

            {/* Attachments */}
            {post.attachments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <span className="text-2xl">📎</span>
                  Attachments
                  <span className="px-2 py-0.5 bg-muted rounded-full text-sm font-normal text-muted-foreground">
                    {post.attachments.length}
                  </span>
                </h3>
                <div className="grid gap-3">
                  {post.attachments.map((url: string, i: number) => {
                    const filename = url.split("/").pop() || `Attachment ${i + 1}`;
                    return (
                      <motion.a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        whileHover={{ x: 4 }}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl",
                          "bg-card border border-border/50 hover:border-primary/30",
                          "hover:shadow-lg transition-all group"
                        )}
                      >
                        <span className="text-3xl">{getFileIcon(url)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {filename}
                          </p>
                          <p className="text-sm text-muted-foreground">Click to download</p>
                        </div>
                        <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                      </motion.a>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Audience Info */}
            {post.audience?.type !== "all" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 bg-card rounded-2xl border border-border/50"
              >
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Target Audience
                </h3>
                <div className="space-y-4">
                  {post.audience?.departments?.length ? (
                    <div className="flex items-start gap-3">
                      <Building className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1.5">Departments</p>
                        <div className="flex flex-wrap gap-2">
                          {post.audience.departments.map((dept) => (
                            <span
                              key={dept}
                              className="px-3 py-1 bg-muted rounded-lg text-sm"
                            >
                              {dept}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  
                  {post.audience?.roles?.length ? (
                    <div className="flex items-start gap-3">
                      <User className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1.5">Roles</p>
                        <div className="flex flex-wrap gap-2">
                          {post.audience.roles.map((role) => (
                            <span
                              key={role}
                              className="px-3 py-1 bg-muted rounded-lg text-sm"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                  
                  {post.audience?.locations?.length ? (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1.5">Locations</p>
                        <div className="flex flex-wrap gap-2">
                          {post.audience.locations.map((loc) => (
                            <span
                              key={loc}
                              className="px-3 py-1 bg-muted rounded-lg text-sm"
                            >
                              {loc}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </motion.div>
            )}
          </motion.article>

          {/* Sidebar */}
          <aside className="hidden lg:block space-y-6">
            {/* Author Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="p-6 bg-card rounded-2xl border border-border/50 sticky top-24"
            >
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                Written by
              </p>
              <div className="flex items-center gap-3 mb-4">
                {post.author.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={getAuthorName()}
                    className="w-14 h-14 rounded-full"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <User className="w-7 h-7 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-foreground">{getAuthorName()}</p>
                  {post.author.role && (
                    <p className="text-sm text-muted-foreground">{post.author.role}</p>
                  )}
                </div>
              </div>
              
              {/* Tags */}
              {post.tags.length > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors cursor-pointer"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </aside>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-20 pt-12 border-t border-border/50"
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-violet-500" />
                  Related Stories
                </h2>
                <p className="text-muted-foreground mt-1">Continue exploring</p>
              </div>
              <Link
                href="/news"
                className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
              >
                View all
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost, index) => (
                <NewsSpotlightCard
                  key={relatedPost.id}
                  post={{
                    ...relatedPost,
                    content: null,
                    pinned: false,
                    coverImage: relatedPost.coverImage ?? undefined,
                    publishedAt: relatedPost.publishedAt 
                      ? typeof relatedPost.publishedAt === 'string' 
                        ? relatedPost.publishedAt 
                        : relatedPost.publishedAt.toISOString()
                      : null,
                  }}
                  variant="compact"
                  showActions={false}
                  showStats={false}
                  index={index}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Scroll to Top Button */}
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={scrollToTop}
            className={cn(
              "fixed bottom-8 right-8 z-50 p-4 rounded-2xl",
              "bg-card border border-border shadow-xl",
              "hover:shadow-2xl transition-shadow"
            )}
          >
            <ArrowUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
