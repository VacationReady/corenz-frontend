"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { FilterProvider, useFilters } from "@/components/ui/FilterProvider";
import { FilterBar } from "@/components/ui/FilterBar";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import NewsHero from "./NewsHero";
import NewsSpotlightCard from "./NewsSpotlightCard";
import NewsChip from "../ui/NewsChip";
import NewsTag from "../ui/NewsTag";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Grid3X3,
  List,
  Filter,
  TrendingUp,
  Clock,
  Star,
  Calendar,
  Users,
  Hash,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { FilterOption } from "@/types/filter";

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  content: any;
  excerpt?: string;
  coverImage?: string;
  authorId: string;
  author: {
    name: string | null;
    email: string;
    avatar?: string;
  };
  publishedAt: string | null;
  pinned: boolean;
  featured?: boolean;
  tags: string[];
  createdAt: string;
  readTime?: number;
  views?: number;
  reactions?: Record<string, number>;
  bookmarkCount?: number;
  isBookmarked?: boolean;
  userReaction?: string | null;
}

interface NewsPageClientProps {
  posts: NewsPost[];
  canPost: boolean;
}

// Quick filter categories
const quickFilters = [
  { id: "all", label: "All Posts", emoji: "📰", active: true },
  { id: "trending", label: "Trending", emoji: "🔥", type: "trending" as const },
  { id: "recent", label: "Recent", emoji: "🆕", type: "new" as const },
  { id: "featured", label: "Featured", emoji: "⭐", type: "featured" as const },
  { id: "announcements", label: "Announcements", emoji: "📢", type: "urgent" as const },
];

// View modes
const viewModes = [
  { id: "grid", icon: Grid3X3, label: "Grid View" },
  { id: "list", icon: List, label: "List View" },
];

function NewsContent({ posts, canPost }: NewsPageClientProps) {
  const { filters } = useFilters();
  const breadcrumbs = useBreadcrumbs();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeQuickFilter, setActiveQuickFilter] = useState("all");
  const [postState, setPostState] = useState(posts);

  useEffect(() => {
    setPostState(posts);
  }, [posts]);

  // ✅ Unified author name formatter
  const getAuthorName = (author: NewsPost["author"]) =>
    author?.name || author?.email || "Unknown Author";

  // Filter options
  const authorOptions: FilterOption[] = useMemo(() => {
    const authors = [
      ...new Set(postState.map((post) => getAuthorName(post.author))),
    ];
    return [
      { label: "All Authors", value: "all" },
      ...authors.map((author) => ({ label: author, value: author })),
    ];
  }, [postState]);

  const tagOptions: FilterOption[] = useMemo(() => {
    const tags = [...new Set(postState.flatMap((post) => post.tags))];
    return [
      { label: "All Tags", value: "all" },
      ...tags.map((tag) => ({ label: tag, value: tag })),
    ];
  }, [postState]);

  const sortOptions: FilterOption[] = [
    { label: "Latest First", value: "date-desc" },
    { label: "Oldest First", value: "date-asc" },
    { label: "Most Popular", value: "popular" },
    { label: "Title A-Z", value: "title-asc" },
    { label: "Title Z-A", value: "title-desc" },
  ];

  // Filter & sort posts
  const filteredPosts = useMemo(() => {
    let filtered = [...postState];

    // Apply quick filter
    switch (activeQuickFilter) {
      case "trending":
        filtered = filtered.filter(post => post.views && post.views > 100);
        break;
      case "recent":
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        filtered = filtered.filter(post => 
          new Date(post.publishedAt || post.createdAt) > oneWeekAgo
        );
        break;
      case "featured":
        filtered = filtered.filter(post => post.featured || post.pinned);
        break;
      case "announcements":
        filtered = filtered.filter(post => 
          post.tags.some(tag => 
            tag.toLowerCase().includes("announcement") || 
            tag.toLowerCase().includes("important")
          )
        );
        break;
    }

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (post) =>
          post.title.toLowerCase().includes(searchLower) ||
          getAuthorName(post.author).toLowerCase().includes(searchLower) ||
          post.tags.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          post.excerpt?.toLowerCase().includes(searchLower)
      );
    }

    // Apply author filter
    if (filters.authors.length > 0 && !filters.authors.includes("all")) {
      filtered = filtered.filter((post) =>
        filters.authors.includes(getAuthorName(post.author))
      );
    }

    // Apply tag filter
    if (filters.categories.length > 0 && !filters.categories.includes("all")) {
      filtered = filtered.filter((post) =>
        post.tags.some((tag) => filters.categories.includes(tag))
      );
    }

    // Apply sorting
    if (filters.sortBy) {
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case "date-desc":
            return new Date(b.publishedAt || b.createdAt).getTime() - 
                   new Date(a.publishedAt || a.createdAt).getTime();
          case "date-asc":
            return new Date(a.publishedAt || a.createdAt).getTime() - 
                   new Date(b.publishedAt || b.createdAt).getTime();
          case "popular":
            return (b.views || 0) - (a.views || 0);
          case "title-asc":
            return a.title.localeCompare(b.title);
          case "title-desc":
            return b.title.localeCompare(a.title);
          default:
            return 0;
        }
      });
    }

    // Always keep pinned posts at the top
    return filtered.sort((a, b) =>
      a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1
    );
  }, [postState, filters, activeQuickFilter]);

  const handleReactionChange = async (targetPost: NewsPost, reactionId: string) => {
    const current = postState.find((post) => post.id === targetPost.id);
    if (!current) return;

    const previousSnapshot: NewsPost = {
      ...current,
      reactions: { ...(current.reactions ?? {}) },
    };

    const isRemoving = current.userReaction === reactionId;
    const optimisticReactions = { ...(current.reactions ?? {}) };

    if (current.userReaction) {
      optimisticReactions[current.userReaction] = Math.max(
        (optimisticReactions[current.userReaction] ?? 1) - 1,
        0,
      );
    }

    if (!isRemoving) {
      optimisticReactions[reactionId] = (optimisticReactions[reactionId] ?? 0) + 1;
    }

    setPostState((prev) =>
      prev.map((post) =>
        post.id === targetPost.id
          ? {
              ...post,
              userReaction: isRemoving ? null : reactionId,
              reactions: optimisticReactions,
            }
          : post,
      ),
    );

    try {
      const response = await fetch(`/api/news/${targetPost.slug}/reaction`, {
        method: isRemoving ? "DELETE" : "POST",
        headers: isRemoving ? undefined : { "Content-Type": "application/json" },
        body: isRemoving ? undefined : JSON.stringify({ reaction: reactionId }),
      });

      if (!response.ok) {
        throw new Error("Failed to update reaction");
      }

      const data = await response.json();

      setPostState((prev) =>
        prev.map((post) =>
          post.id === targetPost.id
            ? {
                ...post,
                userReaction: data.userReaction ?? null,
                reactions: data.reactions ?? {},
              }
            : post,
        ),
      );
    } catch (error) {
      setPostState((prev) =>
        prev.map((post) => (post.id === targetPost.id ? previousSnapshot : post)),
      );
      toast.error("Unable to update reaction. Please try again.");
    }
  };

  const handleBookmarkToggle = async (targetPost: NewsPost) => {
    const current = postState.find((post) => post.id === targetPost.id);
    if (!current) return;

    const previousSnapshot: NewsPost = {
      ...current,
      reactions: { ...(current.reactions ?? {}) },
    };

    const nextState = !current.isBookmarked;
    const currentCount = current.bookmarkCount ?? 0;
    const optimisticCount = nextState
      ? currentCount + 1
      : Math.max(currentCount - 1, 0);

    setPostState((prev) =>
      prev.map((post) =>
        post.id === targetPost.id
          ? {
              ...post,
              isBookmarked: nextState,
              bookmarkCount: optimisticCount,
            }
          : post,
      ),
    );

    try {
      const response = await fetch(`/api/news/${targetPost.slug}/bookmark`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to toggle bookmark");
      }

      const data = await response.json();

      setPostState((prev) =>
        prev.map((post) =>
          post.id === targetPost.id
            ? {
                ...post,
                isBookmarked: Boolean(data.isBookmarked),
                bookmarkCount:
                  typeof data.bookmarkCount === "number"
                    ? data.bookmarkCount
                    : optimisticCount,
              }
            : post,
        ),
      );
    } catch (error) {
      setPostState((prev) =>
        prev.map((post) => (post.id === targetPost.id ? previousSnapshot : post)),
      );
      toast.error("Unable to update bookmarks. Please try again.");
    }
  };

  // Export CSV
  const handleExport = () => {
    const csvContent = [
      ["Title", "Author", "Published Date", "Tags", "Pinned", "Featured", "Views"],
      ...filteredPosts.map((post) => [
        post.title,
        getAuthorName(post.author),
        post.publishedAt
          ? new Date(post.publishedAt).toLocaleDateString()
          : "Draft",
        post.tags.join("; "),
        post.pinned ? "Yes" : "No",
        post.featured ? "Yes" : "No",
        post.views || 0,
      ]),
    ]
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `news-posts-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get stats for the header
  const stats = {
    total: postState.length,
    published: postState.filter(p => p.publishedAt).length,
    featured: postState.filter(p => p.featured || p.pinned).length,
    thisWeek: postState.filter(p => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(p.publishedAt || p.createdAt) > oneWeekAgo;
    }).length,
  };

  return (
    <PageShell
      title="Company News Hub"
      description="Stay connected with the latest updates and announcements"
      icon={<Megaphone className="w-6 h-6" />}
      breadcrumbs={breadcrumbs || undefined}
      action={
        canPost ? (
          <Link href="/news/create">
            <button
              className={cn(
                "flex items-center gap-2 px-5 py-2.5",
                "bg-gradient-to-r from-editorial-purple to-editorial-blue",
                "text-white font-medium rounded-full",
                "hover:shadow-lg hover:scale-105",
                "transition-all duration-200"
              )}
            >
              <Plus className="w-4 h-4" />
              Create News
            </button>
          </Link>
        ) : undefined
      }
    >
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Hash className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Posts</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <Clock className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.thisWeek}</p>
              <p className="text-xs text-muted-foreground">This Week</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Star className="w-4 h-4 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.featured}</p>
              <p className="text-xs text-muted-foreground">Featured</p>
            </div>
          </div>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border/50"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{stats.published}</p>
              <p className="text-xs text-muted-foreground">Published</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Hero Carousel for Featured Posts */}
      {filteredPosts.filter(p => p.pinned || p.featured).length > 0 && (
        <NewsHero posts={filteredPosts} />
      )}

      {/* Quick Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {quickFilters.map((filter) => (
            <NewsChip
              key={filter.id}
              emoji={filter.emoji}
              selected={activeQuickFilter === filter.id}
              onClick={() => setActiveQuickFilter(filter.id)}
              variant={activeQuickFilter === filter.id ? "primary" : "outline"}
              size="md"
              animated
            >
              {filter.label}
            </NewsChip>
          ))}
        </div>
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {viewModes.map((mode) => {
            const Icon = mode.icon;
            return (
              <button
                key={mode.id}
                onClick={() => setViewMode(mode.id as "grid" | "list")}
                className={cn(
                  "p-2 rounded-md transition-all duration-200",
                  viewMode === mode.id
                    ? "bg-card text-primary shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={mode.label}
              >
                <Icon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="mb-6">
        <FilterBar
          config={{
            searchPlaceholder: "Search news by title, author, tags...",
            showAuthorFilter: true,
            showCategoryFilter: true,
          }}
          authorOptions={authorOptions}
          categoryOptions={tagOptions}
          sortOptions={sortOptions}
          onExport={handleExport}
        />
      </div>

      {/* News Grid/List */}
      <AnimatePresence mode="wait">
        {filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="p-4 bg-muted/50 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No news posts found
            </h3>
            <p className="text-muted-foreground max-w-md">
              {filters.search ||
              filters.authors.length > 0 ||
              filters.categories.length > 0
                ? "Try adjusting your filters or search terms to find what you're looking for."
                : "Be the first to share news with your team!"}
            </p>
            {canPost && !filters.search && (
              <Link href="/news/create">
                <button className="mt-6 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:scale-105 transition-all duration-200">
                  Create First Post
                </button>
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div
            layout
            className={cn(
              "grid gap-6",
              viewMode === "grid"
                ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-1 max-w-4xl mx-auto"
            )}
          >
            {filteredPosts.map((post, index) => (
              <NewsSpotlightCard
                key={post.id}
                post={post}
                variant={viewMode === "list" ? "compact" : "default"}
                index={index}
                showActions
                showStats
                onBookmark={() => handleBookmarkToggle(post)}
                onReact={(type) => handleReactionChange(post, type)}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load More Section */}
      {filteredPosts.length >= 12 && (
        <div className="flex justify-center mt-12">
          <button className="flex items-center gap-2 px-6 py-3 bg-muted/50 hover:bg-muted rounded-full transition-all duration-200">
            <span>Load More</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </PageShell>
  );
}

// ✅ Export the wrapper
export default function NewsPageClient(props: NewsPageClientProps) {
  return (
    <FilterProvider>
      <NewsContent {...props} />
    </FilterProvider>
  );
}