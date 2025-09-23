"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import NewsContentRenderer from "./NewsContentRenderer";
import NewsContentTipTapRenderer from "./NewsContentTipTapRenderer";
import DeleteNewsButton from "./DeleteNewsButton";
import NewsTag from "../ui/NewsTag";
import NewsChip from "../ui/NewsChip";
import NewsSpotlightCard from "./NewsSpotlightCard";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
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
  { id: "twitter", icon: Twitter, label: "Twitter", color: "hover:bg-blue-500/10 hover:text-blue-500" },
  { id: "linkedin", icon: Linkedin, label: "LinkedIn", color: "hover:bg-blue-600/10 hover:text-blue-600" },
  { id: "facebook", icon: Facebook, label: "Facebook", color: "hover:bg-blue-700/10 hover:text-blue-700" },
  { id: "email", icon: Mail, label: "Email", color: "hover:bg-gray-500/10 hover:text-gray-500" },
  { id: "link", icon: LinkIcon, label: "Copy Link", color: "hover:bg-green-500/10 hover:text-green-500" },
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
  const router = useRouter();
  const [viewCount, setViewCount] = useState(post.views ?? 0);
  const [reactions, setReactions] = useState<Record<string, number>>(post.reactions ?? {});
  const [bookmarkCount, setBookmarkCount] = useState(post.bookmarkCount ?? 0);
  const [isBookmarked, setIsBookmarked] = useState(post.isBookmarked ?? false);
  const [userReaction, setUserReaction] = useState<string | null>(post.userReaction ?? null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const trackView = async () => {
      try {
        const response = await fetch(`/api/news/${post.slug}/view`, {
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
  }, [post.slug]);

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = post.title;

    switch (platform) {
      case "twitter":
        window.open(
          `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            title
          )}&url=${encodeURIComponent(url)}`,
          "_blank"
        );
        break;
      case "linkedin":
        window.open(
          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
            url
          )}`,
          "_blank"
        );
        break;
      case "facebook":
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            url
          )}`,
          "_blank"
        );
        break;
      case "email":
        window.location.href = `mailto:?subject=${encodeURIComponent(
          title
        )}&body=${encodeURIComponent(`Check out this article: ${url}`)}`;
        break;
      case "link":
        navigator.clipboard.writeText(url);
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
      const response = await fetch(`/api/news/${post.slug}/reaction`, {
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
          ? `You reacted with ${
              reactionEmojis.find((r) => r.id === data.userReaction)?.emoji ?? ""
            }`
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
      const response = await fetch(`/api/news/${post.slug}/bookmark`, {
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

  const getAuthorName = () =>
    post.author?.name || post.author?.email?.split("@")[0] || "Unknown Author";

  const getTimeAgo = (date: Date | string) => {
    const now = new Date();
    const postDate = new Date(date);
    const diffInHours = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)} hours ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} days ago`;
    return format(postDate, "MMM dd, yyyy");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <div className="relative">
        {/* Cover Image or Gradient Background */}
        <div className="relative h-[400px] overflow-hidden">
          {post.coverImage ? (
            <>
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-editorial-purple via-editorial-blue to-editorial-teal">
              <div className="absolute inset-0 bg-mesh-gradient opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          )}

          {/* Navigation Bar */}
          <div className="absolute top-0 left-0 right-0 z-20 p-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <button
                onClick={() => router.push("/news")}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to News</span>
              </button>

              {canEdit && (
                <div className="flex items-center gap-2">
                  <Link href={`/news/${post.slug}/edit`}>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all">
                      <Edit className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </Link>
                  <DeleteNewsButton slug={post.slug} variant="icon" />
                </div>
              )}
            </div>
          </div>

          {/* Title and Meta on Hero */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-wrap gap-2 mb-4">
                {post.pinned && (
                  <NewsTag label="📌 Pinned" type="featured" size="sm" />
                )}
                {post.featured && (
                  <NewsTag label="✨ Featured" type="new" size="sm" />
                )}
                {post.tags.slice(0, 3).map((tag) => (
                  <NewsChip
                    key={tag}
                    variant="gradient"
                    size="sm"
                    className="bg-white/10 backdrop-blur-sm text-white border-white/20"
                  >
                    {tag}
                  </NewsChip>
                ))}
              </div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight"
              >
                {post.title}
              </motion.h1>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex flex-wrap items-center gap-4 text-white/90"
              >
                <div className="flex items-center gap-2">
                  {post.author.avatar ? (
                    <img
                      src={post.author.avatar}
                      alt={getAuthorName()}
                      className="w-8 h-8 rounded-full border-2 border-white/20"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                  <span className="font-medium">{getAuthorName()}</span>
                </div>
                {post.publishedAt && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{getTimeAgo(post.publishedAt)}</span>
                  </div>
                )}
                {post.readTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    <span>{post.readTime} min read</span>
                  </div>
                )}
                {viewCount > 0 && (
                  <div className="flex items-center gap-1">
                    <Eye className="w-4 h-4" />
                    <span>{viewCount} views</span>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Reactions */}
              <div className="relative">
                <button
                  onClick={() => setShowReactions(!showReactions)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full transition-all",
                    userReaction
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/50 hover:bg-muted"
                  )}
                >
                  {userReaction ? (
                    <span className="text-lg">
                      {reactionEmojis.find((r) => r.id === userReaction)?.emoji}
                    </span>
                  ) : (
                    <Heart className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">
                    {Object.values(reactions || {}).reduce(
                      (a, b) => (a || 0) + (b || 0),
                      0
                    ) || 0}
                  </span>
                </button>

                <AnimatePresence>
                  {showReactions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute top-full mt-2 left-0 bg-card rounded-xl shadow-xl border border-border p-2 flex gap-1"
                    >
                      {reactionEmojis.map((reaction) => (
                        <button
                          key={reaction.id}
                          onClick={() => handleReaction(reaction.id)}
                          className={cn(
                            "p-2 rounded-lg hover:bg-muted transition-all hover:scale-110",
                            userReaction === reaction.id && "bg-primary/10"
                          )}
                          title={reaction.label}
                        >
                          <span className="text-xl">{reaction.emoji}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Comments */}
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-all">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">0</span>
              </button>

              {/* Share */}
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted transition-all"
                >
                  <Share2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Share</span>
                </button>

                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      className="absolute top-full mt-2 left-0 bg-card rounded-xl shadow-xl border border-border p-2 w-48"
                    >
                      {shareOptions.map((option) => {
                        const Icon = option.icon;
                        return (
                          <button
                            key={option.id}
                            onClick={() => handleShare(option.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                              option.color
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            <span className="text-sm">{option.label}</span>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bookmark */}
            <button
              onClick={() => {
                void handleBookmarkToggle();
              }}
              className={cn(
                "p-2 rounded-full transition-all",
                isBookmarked
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/50 hover:bg-muted"
              )}
            >
              <span className="flex items-center gap-1">
                <Bookmark className="w-4 h-4" />
                {bookmarkCount > 0 ? (
                  <span className="text-xs font-medium">{bookmarkCount}</span>
                ) : null}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Content */}
        {post?.content && typeof post.content === "object" && post.content?.type && post.content?.content ? (
          <NewsContentTipTapRenderer content={post.content} className="mb-12" />
        ) : (
          <NewsContentRenderer content={post.content || []} className="mb-12" />
        )}

        {/* Video Embed */}
        {post.videoEmbedUrl && (
          <div className="mb-12">
            <h3 className="text-lg font-semibold mb-4">📹 Video Content</h3>
            <div className="relative rounded-xl overflow-hidden shadow-lg">
              <iframe
                src={post.videoEmbedUrl}
                className="w-full aspect-video"
                allowFullScreen
              />
            </div>
          </div>
        )}

        {/* Attachments */}
        {post.attachments.length > 0 && (
          <div className="mb-12">
            <h3 className="text-lg font-semibold mb-4">📎 Attachments</h3>
            <div className="grid gap-3">
              {post.attachments.map((url: string, i: number) => {
                const filename = url.split("/").pop() || `Attachment ${i + 1}`;
                const fileExt = filename.split(".").pop()?.toLowerCase();
                const fileEmoji =
                  fileExt === "pdf"
                    ? "📄"
                    : fileExt === "doc" || fileExt === "docx"
                    ? "📝"
                    : fileExt === "xls" || fileExt === "xlsx"
                    ? "📊"
                    : fileExt === "ppt" || fileExt === "pptx"
                    ? "📑"
                    : fileExt === "zip" || fileExt === "rar"
                    ? "🗂️"
                    : "📎";

                return (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border hover:bg-muted/50 transition-all group"
                  >
                    <span className="text-2xl">{fileEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">
                        {filename}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Audience Targeting Info */}
        {post.audience?.type !== "all" && (
          <div className="mb-12 p-6 bg-muted/30 rounded-xl border border-border">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Target Audience
            </h3>
            <div className="grid gap-3">
              {post.audience?.departments?.length ? (
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Departments</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {post.audience.departments.map((dept) => (
                        <NewsChip key={dept} size="sm" variant="outline">
                          {dept}
                        </NewsChip>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              
              {post.audience?.roles?.length ? (
                <div className="flex items-start gap-3">
                  <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Roles</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {post.audience.roles.map((role) => (
                        <NewsChip key={role} size="sm" variant="outline">
                          {role}
                        </NewsChip>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
              
              {post.audience?.locations?.length ? (
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Locations</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {post.audience.locations.map((loc) => (
                        <NewsChip key={loc} size="sm" variant="outline">
                          {loc}
                        </NewsChip>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-editorial-purple" />
                Related Stories
              </h3>
              <Link
                href="/news"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View all news
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedPosts.map((relatedPost, index) => (
                <NewsSpotlightCard
                  key={relatedPost.id}
                  post={{
                    ...relatedPost,
                    content: null,
                    pinned: false,
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
          </div>
        )}
      </div>
    </div>
  );
}
