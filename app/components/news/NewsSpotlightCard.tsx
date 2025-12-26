"use client";

import { useState } from "react";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import NewsChip from "../ui/NewsChip";
import { Avatar } from "@/components/ui/Avatar";
import {
  Clock,
  Eye,
  Share2,
  Bookmark,
  Heart,
  ChevronRight,
  Sparkles,
  MessageCircle,
  ArrowUpRight,
  MoreHorizontal,
  ThumbsUp,
  Flame,
  PartyPopper,
} from "lucide-react";

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  content?: any;
  author: {
    name: string | null;
    email: string;
    avatar?: string | null;
  };
  publishedAt: string | null;
  tags: string[];
  pinned: boolean;
  featured?: boolean;
  readTime?: number;
  views?: number;
  reactions?: Record<string, number>;
  bookmarkCount?: number;
  isBookmarked?: boolean;
  userReaction?: string | null;
  isDraft?: boolean;
}

interface NewsSpotlightCardProps {
  post: NewsPost;
  variant?: "default" | "compact" | "featured" | "minimal";
  showActions?: boolean;
  showStats?: boolean;
  index?: number;
  onShare?: () => void;
  onBookmark?: () => Promise<void> | void;
  onReact?: (type: string) => Promise<void> | void;
}

const reactionOptions = [
  { id: "like", emoji: "👍", label: "Like" },
  { id: "heart", emoji: "❤️", label: "Love" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "celebrate", emoji: "🎉", label: "Celebrate" },
];

export default function NewsSpotlightCard({
  post,
  variant = "default",
  showActions = true,
  showStats = true,
  index = 0,
  onShare,
  onBookmark,
  onReact,
}: NewsSpotlightCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onBookmark?.();
  };

  const handleReact = (type: string) => {
    onReact?.(type);
    setShowReactionPicker(false);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare?.();
  };

  const getAuthorName = (author: NewsPost["author"]) =>
    author?.name || author?.email?.split("@")[0] || "Unknown Author";

  const totalReactions = Object.values(post.reactions ?? {}).reduce(
    (a, b) => (a || 0) + (b || 0),
    0
  );

  // Gradient palettes for cards without images
  const gradientPalettes = [
    "from-violet-500 via-purple-500 to-fuchsia-500",
    "from-cyan-500 via-blue-500 to-indigo-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-orange-500 via-pink-500 to-rose-500",
    "from-amber-500 via-orange-500 to-red-500",
  ];

  const getGradient = () => gradientPalettes[index % gradientPalettes.length];

  const cardContent = () => {
    switch (variant) {
      case "featured":
        return (
          <motion.div
            className="group relative overflow-hidden rounded-3xl h-80"
            whileHover={{ y: -4 }}
            transition={{ duration: 0.3 }}
          >
            {/* Background */}
            {post.coverImage ? (
              <>
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
              </>
            ) : (
              <div className={cn("w-full h-full bg-gradient-to-br", getGradient())}>
                <div 
                  className="absolute inset-0 opacity-30" 
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} 
                />
              </div>
            )}

            {/* Badges */}
            <div className="absolute top-4 left-4 flex gap-2 z-10">
              {post.pinned && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="px-3 py-1.5 bg-amber-500/90 text-amber-950 text-xs font-bold rounded-full shadow-lg"
                >
                  📌 Pinned
                </motion.span>
              )}
              {post.featured && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="px-3 py-1.5 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold rounded-full shadow-lg"
                >
                  <Sparkles className="w-3 h-3 inline mr-1" />
                  Featured
                </motion.span>
              )}
            </div>

            {/* Content Overlay */}
            <div className="absolute inset-x-0 bottom-0 p-6 z-10">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 bg-white/20 backdrop-blur-sm text-white text-xs font-medium rounded-lg"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-2xl font-bold text-white leading-tight line-clamp-2">
                  {post.title}
                </h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-white/80 text-sm">
                    <span>{getAuthorName(post.author)}</span>
                    {post.publishedAt && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-white/50" />
                        <span>{format(new Date(post.publishedAt), "MMM dd")}</span>
                      </>
                    )}
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>
        );

      case "compact":
        return (
          <motion.div
            whileHover={{ x: 4 }}
            className="flex gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/50 hover:border-primary/30 hover:bg-card/80 hover:shadow-lg transition-all duration-300"
          >
            {post.coverImage && (
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                  <span>{getAuthorName(post.author)}</span>
                  {post.publishedAt && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                      <span>{format(new Date(post.publishedAt), "MMM dd")}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex gap-1.5 mt-2">
                {post.tags.slice(0, 2).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground/50 self-center" />
          </motion.div>
        );

      case "minimal":
        return (
          <motion.div
            whileHover={{ x: 4 }}
            className="space-y-2 p-4 rounded-xl hover:bg-muted/50 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-medium text-foreground line-clamp-2 flex-1 group-hover:text-primary transition-colors">
                {post.title}
              </h3>
              {post.pinned && <span className="text-lg shrink-0">📌</span>}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{getAuthorName(post.author)}</span>
              {post.publishedAt && (
                <>
                  <span className="w-1 h-1 rounded-full bg-muted-foreground/50" />
                  <span>{format(new Date(post.publishedAt), "MMM dd")}</span>
                </>
              )}
            </div>
          </motion.div>
        );

      default:
        return (
          <motion.div
            className="group relative h-full overflow-hidden rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
              setIsHovered(false);
              setShowReactionPicker(false);
            }}
            whileHover={{ y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
          >
            {/* Gradient border glow on hover */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-pink-500 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-opacity duration-500" />
            
            {/* Card Content Container */}
            <div className="relative h-full bg-card rounded-2xl overflow-hidden">
              {/* Cover Image */}
              <div className="relative h-52 overflow-hidden">
                {post.coverImage ? (
                  <>
                    <img
                      src={post.coverImage}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </>
                ) : (
                  <div className={cn("w-full h-full bg-gradient-to-br", getGradient())}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="w-16 h-16 text-white/30" />
                    </div>
                    <div 
                      className="absolute inset-0 opacity-30" 
                      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")` }} 
                    />
                  </div>
                )}
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex gap-2 z-10">
                  {post.isDraft && (
                    <motion.span
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-2.5 py-1 bg-amber-500/95 text-amber-950 text-xs font-bold rounded-lg shadow-lg shadow-amber-500/30 backdrop-blur-sm"
                    >
                      ✏️ Draft
                    </motion.span>
                  )}
                  {post.pinned && !post.isDraft && (
                    <motion.span
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-2.5 py-1 bg-amber-500/95 text-amber-950 text-xs font-bold rounded-lg shadow-lg shadow-amber-500/30 backdrop-blur-sm"
                    >
                      📌 Pinned
                    </motion.span>
                  )}
                  {post.featured && !post.isDraft && (
                    <motion.span
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className="px-2.5 py-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-violet-500/30"
                    >
                      ✨ Featured
                    </motion.span>
                  )}
                </div>

                {/* Quick actions on hover */}
                <AnimatePresence>
                  {isHovered && showActions && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-3 right-3 flex gap-2"
                    >
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleShare}
                        className="p-2.5 rounded-xl bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white shadow-lg transition-all"
                      >
                        <Share2 className="w-4 h-4" />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleBookmark}
                        className={cn(
                          "p-2.5 rounded-xl backdrop-blur-sm shadow-lg transition-all",
                          post.isBookmarked
                            ? "bg-amber-500 text-amber-950"
                            : "bg-white/90 text-slate-700 hover:bg-white"
                        )}
                      >
                        <Bookmark className={cn("w-4 h-4", post.isBookmarked && "fill-current")} />
                      </motion.button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Content */}
              <div className="p-5 space-y-4">
                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {post.tags.slice(0, 3).map((tag, i) => (
                    <span
                      key={tag}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-lg transition-colors",
                        i === 0
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {tag}
                    </span>
                  ))}
                  {post.tags.length > 3 && (
                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-lg">
                      +{post.tags.length - 3}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors duration-300">
                  {post.title}
                </h3>

                {/* Excerpt */}
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {post.excerpt}
                  </p>
                )}

                {/* Author Info */}
                <div className="flex items-center gap-3 pt-1">
                  <Avatar
                    src={post.author.avatar}
                    name={getAuthorName(post.author)}
                    size={36}
                    className="ring-2 ring-border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {getAuthorName(post.author)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {post.publishedAt
                        ? formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })
                        : "Draft"}
                      {post.readTime && ` • ${post.readTime} min read`}
                    </p>
                  </div>
                </div>

                {/* Stats & Actions */}
                {(showStats || showActions) && (
                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    {showStats && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {post.views !== undefined && (
                          <span className="flex items-center gap-1.5">
                            <Eye className="w-4 h-4" />
                            {post.views.toLocaleString()}
                          </span>
                        )}
                        {totalReactions > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Heart className="w-4 h-4" />
                            {totalReactions}
                          </span>
                        )}
                        {post.bookmarkCount !== undefined && post.bookmarkCount > 0 && (
                          <span className="flex items-center gap-1.5">
                            <Bookmark className="w-4 h-4" />
                            {post.bookmarkCount}
                          </span>
                        )}
                      </div>
                    )}

                    {showActions && (
                      <div className="relative flex items-center gap-1">
                        {/* Reaction Button */}
                        <div className="relative">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setShowReactionPicker(!showReactionPicker);
                            }}
                            className={cn(
                              "p-2 rounded-lg transition-all duration-200",
                              post.userReaction
                                ? "bg-primary/10 text-primary"
                                : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {post.userReaction ? (
                              <span className="text-base">
                                {reactionOptions.find(r => r.id === post.userReaction)?.emoji || "👍"}
                              </span>
                            ) : (
                              <Heart className="w-4 h-4" />
                            )}
                          </motion.button>

                          {/* Reaction Picker */}
                          <AnimatePresence>
                            {showReactionPicker && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, y: 10 }}
                                className="absolute bottom-full left-0 mb-2 p-2 bg-card rounded-xl shadow-xl border border-border flex gap-1 z-50"
                                onClick={(e) => e.preventDefault()}
                              >
                                {reactionOptions.map((reaction) => (
                                  <motion.button
                                    key={reaction.id}
                                    whileHover={{ scale: 1.2, y: -2 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleReact(reaction.id);
                                    }}
                                    className={cn(
                                      "p-2 rounded-lg transition-colors",
                                      post.userReaction === reaction.id
                                        ? "bg-primary/20"
                                        : "hover:bg-muted"
                                    )}
                                    title={reaction.label}
                                  >
                                    <span className="text-xl">{reaction.emoji}</span>
                                  </motion.button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Read More */}
                        <motion.div
                          whileHover={{ scale: 1.05 }}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/10 text-primary text-xs font-medium"
                        >
                          <span>Read</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
    }
  };

  // Drafts should link to edit page, published posts to view page
  const linkHref = post.isDraft ? `/news/${post.slug}/edit` : `/news/${post.slug}`;

  return (
    <Link href={linkHref} className="block h-full">
      {cardContent()}
    </Link>
  );
}
