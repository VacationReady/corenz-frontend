"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import NewsTag from "../ui/NewsTag";
import NewsChip from "../ui/NewsChip";
import {
  Clock,
  User,
  Eye,
  MessageCircle,
  Share2,
  Bookmark,
  Heart,
  TrendingUp,
  ChevronRight,
  Sparkles,
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
  reactions?: {
    likes?: number;
    hearts?: number;
    fire?: number;
  };
}

interface NewsSpotlightCardProps {
  post: NewsPost;
  variant?: "default" | "compact" | "featured" | "minimal";
  showActions?: boolean;
  showStats?: boolean;
  index?: number;
  onShare?: () => void;
  onBookmark?: () => void;
  onReact?: (type: string) => void;
}

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
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    onBookmark?.();
  };

  const handleReact = (type: string) => {
    setUserReaction(userReaction === type ? null : type);
    onReact?.(type);
  };

  const getAuthorName = (author: NewsPost["author"]) =>
    author?.name || author?.email?.split("@")[0] || "Unknown Author";

  const getRandomGradient = () => {
    const gradients = [
      "from-purple-500/20 to-pink-500/20",
      "from-blue-500/20 to-cyan-500/20",
      "from-emerald-500/20 to-teal-500/20",
      "from-orange-500/20 to-red-500/20",
      "from-violet-500/20 to-indigo-500/20",
    ];
    return gradients[index % gradients.length];
  };

  const cardContent = () => {
    switch (variant) {
      case "featured":
        return (
          <div className="group relative overflow-hidden rounded-2xl">
            {/* Background with gradient overlay */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-br opacity-60",
                getRandomGradient()
              )}
            />
            
            {/* Cover Image */}
            {post.coverImage && (
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full h-64 object-cover"
              />
            )}
            
            {/* Glass overlay on hover */}
            <div
              className={cn(
                "absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent",
                "transition-all duration-300",
                isHovered && "backdrop-blur-sm"
              )}
            />

            {/* Content */}
            <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
              <div className="space-y-3">
                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {post.pinned && <NewsTag label="📌 Pinned" type="featured" size="sm" />}
                  {post.featured && <NewsTag label="✨ Featured" type="new" size="sm" />}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold leading-tight">
                  {post.title}
                </h3>

                {/* Excerpt */}
                {post.excerpt && (
                  <p className="text-white/90 line-clamp-2 text-sm">
                    {post.excerpt}
                  </p>
                )}

                {/* Meta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-white/80">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {getAuthorName(post.author)}
                    </span>
                    {post.publishedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(post.publishedAt), "MMM dd")}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        );

      case "compact":
        return (
          <div className="flex gap-4 p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 hover:bg-card/80 transition-all">
            {/* Thumbnail */}
            {post.coverImage && (
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
              />
            )}
            
            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              <h3 className="font-semibold text-foreground line-clamp-1">
                {post.title}
              </h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{getAuthorName(post.author)}</span>
                {post.publishedAt && (
                  <span>{format(new Date(post.publishedAt), "MMM dd")}</span>
                )}
                {post.readTime && <span>{post.readTime} min read</span>}
              </div>
              <div className="flex gap-1">
                {post.tags.slice(0, 2).map((tag) => (
                  <NewsChip key={tag} size="sm" variant="outline">
                    {tag}
                  </NewsChip>
                ))}
              </div>
            </div>
          </div>
        );

      case "minimal":
        return (
          <div className="space-y-2 p-4 rounded-lg hover:bg-muted/50 transition-all">
            <div className="flex items-start justify-between">
              <h3 className="font-medium text-foreground line-clamp-2 flex-1">
                {post.title}
              </h3>
              {post.pinned && (
                <span className="text-lg ml-2">📌</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{getAuthorName(post.author)}</span>
              {post.publishedAt && (
                <span>{format(new Date(post.publishedAt), "MMM dd")}</span>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div
            className={cn(
              "group relative overflow-hidden rounded-2xl",
              "bg-card border border-border/50",
              "hover:shadow-xl hover:shadow-primary/5",
              "transition-all duration-300"
            )}
          >
            {/* Cover Image or Gradient */}
            <div className="relative h-48 overflow-hidden">
              {post.coverImage ? (
                <img
                  src={post.coverImage}
                  alt={post.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div
                  className={cn(
                    "w-full h-full bg-gradient-to-br",
                    getRandomGradient()
                  )}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-white/30" />
                  </div>
                </div>
              )}
              
              {/* Overlay badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                {post.pinned && (
                  <span className="px-2 py-1 bg-yellow-500/90 text-yellow-900 text-xs font-medium rounded-full backdrop-blur-sm">
                    📌 Pinned
                  </span>
                )}
                {post.featured && (
                  <span className="px-2 py-1 bg-purple-500/90 text-white text-xs font-medium rounded-full backdrop-blur-sm">
                    ✨ Featured
                  </span>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {post.tags.slice(0, 3).map((tag, i) => (
                  <NewsChip
                    key={tag}
                    size="sm"
                    variant={i === 0 ? "primary" : "outline"}
                    emoji={i === 0 ? "🏷️" : undefined}
                  >
                    {tag}
                  </NewsChip>
                ))}
                {post.tags.length > 3 && (
                  <NewsChip size="sm" variant="outline">
                    +{post.tags.length - 3}
                  </NewsChip>
                )}
              </div>

              {/* Title */}
              <h3 className="text-xl font-bold text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                {post.title}
              </h3>

              {/* Excerpt */}
              {post.excerpt && (
                <p className="text-muted-foreground text-sm line-clamp-2">
                  {post.excerpt}
                </p>
              )}

              {/* Author & Meta */}
              <div className="flex items-center gap-3">
                {post.author.avatar ? (
                  <img
                    src={post.author.avatar}
                    alt={getAuthorName(post.author)}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {getAuthorName(post.author)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {post.publishedAt
                      ? format(new Date(post.publishedAt), "MMM dd, yyyy")
                      : "Draft"}
                    {post.readTime && ` • ${post.readTime} min read`}
                  </p>
                </div>
              </div>

              {/* Stats & Actions */}
              {(showStats || showActions) && (
                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  {showStats && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {post.views && (
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          {post.views}
                        </span>
                      )}
                      {post.reactions && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-3.5 h-3.5" />
                          {Object.values(post.reactions).reduce((a, b) => (a || 0) + (b || 0), 0)}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {showActions && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleReact("like");
                        }}
                        className={cn(
                          "p-1.5 rounded-lg hover:bg-muted transition-colors",
                          userReaction === "like" && "text-primary bg-primary/10"
                        )}
                        aria-label="Like"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          onShare?.();
                        }}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                        aria-label="Share"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleBookmark();
                        }}
                        className={cn(
                          "p-1.5 rounded-lg hover:bg-muted transition-colors",
                          isBookmarked && "text-primary bg-primary/10"
                        )}
                        aria-label="Bookmark"
                      >
                        <Bookmark className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/news/${post.slug}`} className="block">
        {cardContent()}
      </Link>
    </motion.div>
  );
}
