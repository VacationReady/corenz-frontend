"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { PageShell } from "@/components/ui/PageShell";
import { FilterProvider, useFilters } from "@/components/ui/FilterProvider";
import { FilterBar } from "@/components/ui/FilterBar";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import NewsHero from "./NewsHero";
import NewsSpotlightCard from "./NewsSpotlightCard";
import NewsChip from "../ui/NewsChip";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { toast } from "sonner";
import {
  Megaphone,
  Plus,
  Grid3X3,
  List,
  Clock,
  Star,
  Users,
  Hash,
  Sparkles,
  ChevronRight,
  Eye,
  TrendingUp,
  Newspaper,
  Search,
  Filter,
  LayoutGrid,
  Rows3,
  Zap,
  ArrowUpRight,
  Bookmark,
} from "lucide-react";
import { FilterOption } from "@/types/filter";
import { formatDistanceToNow } from "date-fns";
import { handleNewsShare, createShareOptions, fetchNewsPage, PaginationState } from "@/lib/news-utils";
import { useTenantFetch } from "@/hooks/useTenantFetch";
import { useSession } from "next-auth/react";

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  content?: any;
  excerpt?: string;
  coverImage?: string;
  authorId?: string;
  author: {
    name: string | null;
    email: string;
    avatar?: string;
  };
  publishedAt: string | null;
  pinned: boolean;
  featured?: boolean;
  tags: string[];
  createdAt?: string;
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

// Quick filter categories with modern design
const quickFilters = [
  { id: "all", label: "All Stories", emoji: "📰", gradient: "from-slate-500 to-slate-700" },
  { id: "trending", label: "Trending", emoji: "🔥", gradient: "from-orange-500 to-red-500" },
  { id: "recent", label: "Fresh", emoji: "✨", gradient: "from-emerald-500 to-teal-500" },
  { id: "featured", label: "Featured", emoji: "⭐", gradient: "from-amber-500 to-yellow-500" },
  { id: "announcements", label: "Important", emoji: "📢", gradient: "from-rose-500 to-pink-500" },
];

// View modes with icons
const viewModes = [
  { id: "grid", icon: LayoutGrid, label: "Grid" },
  { id: "list", icon: Rows3, label: "List" },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 24,
    },
  },
};

const statCardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.1,
      type: "spring",
      stiffness: 260,
      damping: 20,
    },
  }),
};

function NewsContent({ posts, canPost }: NewsPageClientProps) {
  const { data: session } = useSession();
  const tenantFetch = useTenantFetch();
  const { filters } = useFilters();
  const breadcrumbs = useBreadcrumbs();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeQuickFilter, setActiveQuickFilter] = useState("all");
  const [postState, setPostState] = useState(posts);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: 12,
    hasMore: posts.length >= 12,
    loading: false,
  });

  useEffect(() => {
    setPostState(posts);
  }, [posts]);

  // Unified author name formatter
  const getAuthorName = useCallback((author: NewsPost["author"]) =>
    author?.name || author?.email || "Unknown Author", []);

  // Filter options
  const authorOptions: FilterOption[] = useMemo(() => {
    const authors = [
      ...new Set(postState.map((post) => getAuthorName(post.author))),
    ];
    return [
      { label: "All Authors", value: "all" },
      ...authors.map((author) => ({ label: author, value: author })),
    ];
  }, [postState, getAuthorName]);

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
        filtered = filtered.filter(post => {
          const dateStr = post.publishedAt || post.createdAt;
          if (!dateStr) return false;
          return new Date(dateStr) > oneWeekAgo;
        });
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
            const bDate = b.publishedAt || b.createdAt;
            const aDate = a.publishedAt || a.createdAt;
            return new Date(bDate || 0).getTime() - new Date(aDate || 0).getTime();
          case "date-asc":
            const aDateAsc = a.publishedAt || a.createdAt;
            const bDateAsc = b.publishedAt || b.createdAt;
            return new Date(aDateAsc || 0).getTime() - new Date(bDateAsc || 0).getTime();
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
  }, [postState, filters, activeQuickFilter, getAuthorName]);

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
      const response = await tenantFetch(`/api/news/${targetPost.slug}/reaction`, {
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
      const response = await tenantFetch(`/api/news/${targetPost.slug}/bookmark`, {
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

  const handleShare = async (post: NewsPost) => {
    const shareOptions = createShareOptions({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
    });

    await handleNewsShare(post.slug, shareOptions, session?.user?.companyId);
  };

  const handleLoadMore = async () => {
    if (pagination.loading || !pagination.hasMore) return;

    setPagination((prev) => ({ ...prev, loading: true }));

    try {
      const nextPage = pagination.page + 1;
      const data = await fetchNewsPage(nextPage, pagination.limit, session?.user?.companyId);

      setPostState((prev) => [...prev, ...data.posts]);
      setPagination({
        page: nextPage,
        limit: pagination.limit,
        hasMore: data.pagination.hasMore,
        loading: false,
      });

      toast.success(`Loaded ${data.posts.length} more posts`);
    } catch (error) {
      console.error("Failed to load more posts:", error);
      toast.error("Failed to load more posts. Please try again.");
      setPagination((prev) => ({ ...prev, loading: false }));
    }
  };

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
  const stats = useMemo(() => ({
    total: postState.length,
    published: postState.filter(p => p.publishedAt).length,
    featured: postState.filter(p => p.featured || p.pinned).length,
    thisWeek: postState.filter(p => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const dateStr = p.publishedAt || p.createdAt;
      return dateStr && new Date(dateStr) > oneWeekAgo;
    }).length,
    totalViews: postState.reduce((sum, p) => sum + (p.views || 0), 0),
    engagement: postState.reduce((sum, p) => 
      sum + Object.values(p.reactions || {}).reduce((a, b) => a + b, 0), 0
    ),
  }), [postState]);

  const statCards = [
    { 
      label: "Total Stories", 
      value: stats.total, 
      icon: Newspaper, 
      gradient: "from-violet-500 to-purple-600",
      shadowColor: "shadow-violet-500/25"
    },
    { 
      label: "This Week", 
      value: stats.thisWeek, 
      icon: Zap, 
      gradient: "from-emerald-500 to-teal-600",
      shadowColor: "shadow-emerald-500/25"
    },
    { 
      label: "Featured", 
      value: stats.featured, 
      icon: Star, 
      gradient: "from-amber-500 to-orange-600",
      shadowColor: "shadow-amber-500/25"
    },
    { 
      label: "Total Views", 
      value: stats.totalViews.toLocaleString(), 
      icon: Eye, 
      gradient: "from-cyan-500 to-blue-600",
      shadowColor: "shadow-cyan-500/25"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden"
      >
        {/* Ambient Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          {/* Title Section */}
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
            <div className="space-y-3">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="flex items-center gap-3"
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl blur-lg opacity-50" />
                  <div className="relative p-3 bg-gradient-to-br from-violet-500 to-fuchsia-600 rounded-2xl shadow-lg">
                    <Megaphone className="w-7 h-7 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                    News Hub
                  </h1>
                  <p className="text-muted-foreground text-sm lg:text-base">
                    Stay connected with the latest updates
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Create Button */}
            {canPost && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <Link href="/news/create">
                  <button
                    className={cn(
                      "group relative flex items-center gap-3 px-6 py-3.5",
                      "bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600",
                      "text-white font-semibold rounded-2xl",
                      "shadow-xl shadow-violet-500/30",
                      "hover:shadow-2xl hover:shadow-violet-500/40",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      "transition-all duration-300 ease-out"
                    )}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 rounded-2xl opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300" />
                    <Plus className="w-5 h-5 relative z-10 group-hover:rotate-90 transition-transform duration-300" />
                    <span className="relative z-10">Create Story</span>
                    <ArrowUpRight className="w-4 h-4 relative z-10 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </button>
                </Link>
              </motion.div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  custom={index}
                  variants={statCardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover={{ y: -4, scale: 1.02 }}
                  className={cn(
                    "relative group overflow-hidden",
                    "bg-card/60 backdrop-blur-xl rounded-2xl p-5",
                    "border border-white/10",
                    "shadow-lg", stat.shadowColor,
                    "hover:shadow-xl transition-all duration-300"
                  )}
                >
                  {/* Gradient accent */}
                  <div className={cn(
                    "absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 group-hover:opacity-30 transition-opacity",
                    `bg-gradient-to-br ${stat.gradient}`
                  )} />
                  
                  <div className="relative flex items-start justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                      <p className="text-3xl font-bold text-foreground tracking-tight">{stat.value}</p>
                    </div>
                    <div className={cn(
                      "p-2.5 rounded-xl bg-gradient-to-br",
                      stat.gradient,
                      "shadow-lg", stat.shadowColor
                    )}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Carousel for Featured Posts */}
        <AnimatePresence mode="wait">
          {filteredPosts.filter(p => p.pinned || p.featured).length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <NewsHero 
                posts={filteredPosts}
                onBookmark={handleBookmarkToggle}
                onShare={handleShare}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-4"
        >
          {/* Quick Filters */}
          <div className="flex items-center justify-between gap-4 overflow-hidden">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {quickFilters.map((filter, index) => (
                <motion.button
                  key={filter.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  onClick={() => setActiveQuickFilter(filter.id)}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm",
                    "whitespace-nowrap transition-all duration-300",
                    activeQuickFilter === filter.id
                      ? cn(
                          "bg-gradient-to-r text-white shadow-lg",
                          filter.gradient
                        )
                      : "bg-card/60 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border"
                  )}
                >
                  <span className="text-base">{filter.emoji}</span>
                  <span>{filter.label}</span>
                  {activeQuickFilter === filter.id && (
                    <motion.div
                      layoutId="activeFilter"
                      className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 rounded-xl"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-card/60 backdrop-blur-sm rounded-xl border border-border/50">
              {viewModes.map((mode) => {
                const Icon = mode.icon;
                return (
                  <button
                    key={mode.id}
                    onClick={() => setViewMode(mode.id as "grid" | "list")}
                    className={cn(
                      "p-2.5 rounded-lg transition-all duration-200",
                      viewMode === mode.id
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
          <div className="bg-card/40 backdrop-blur-sm rounded-2xl border border-border/50 p-4">
            <FilterBar
              config={{
                searchPlaceholder: "Search stories by title, author, tags...",
                showAuthorFilter: true,
                showCategoryFilter: true,
              }}
              authorOptions={authorOptions}
              categoryOptions={tagOptions}
              sortOptions={sortOptions}
              onExport={handleExport}
            />
          </div>
        </motion.div>

        {/* Results Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center justify-between text-sm"
        >
          <p className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredPosts.length}</span> of{" "}
            <span className="font-semibold text-foreground">{postState.length}</span> stories
          </p>
          {activeQuickFilter !== "all" && (
            <button
              onClick={() => setActiveQuickFilter("all")}
              className="text-primary hover:underline flex items-center gap-1"
            >
              Clear filter
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </motion.div>

        {/* News Grid/List */}
        {filteredPosts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 rounded-full blur-2xl" />
              <div className="relative p-6 bg-gradient-to-br from-muted to-muted/50 rounded-3xl">
                <Newspaper className="w-16 h-16 text-muted-foreground/50" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">No stories found</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              We couldn't find any news posts matching your current filters. Try adjusting your search criteria.
            </p>
            <button
              onClick={() => {
                setActiveQuickFilter("all");
              }}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              View All Stories
            </button>
          </motion.div>
        ) : (
          <LayoutGroup>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  : "space-y-4"
              )}
            >
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  layout
                  variants={itemVariants}
                  className="group"
                >
                  {viewMode === "grid" ? (
                    <NewsSpotlightCard
                      post={post}
                      variant="default"
                      index={index}
                      showActions
                      showStats
                      onBookmark={() => handleBookmarkToggle(post)}
                      onReact={(type) => handleReactionChange(post, type)}
                      onShare={() => handleShare(post)}
                    />
                  ) : (
                    <Link href={`/news/${post.slug}`}>
                      <motion.div
                        whileHover={{ x: 4 }}
                        className={cn(
                          "flex gap-5 p-5",
                          "bg-card/60 backdrop-blur-sm rounded-2xl",
                          "border border-border/50 hover:border-primary/30",
                          "shadow-sm hover:shadow-lg hover:shadow-primary/5",
                          "transition-all duration-300"
                        )}
                      >
                        {post.coverImage && (
                          <div className="relative w-48 h-32 rounded-xl overflow-hidden shrink-0">
                            <img
                              src={post.coverImage}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                            {post.pinned && (
                              <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500/90 text-amber-950 text-xs font-semibold rounded-lg backdrop-blur-sm">
                                📌 Pinned
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              {post.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-md"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <h3 className="text-lg font-semibold text-foreground line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                              {post.title}
                            </h3>
                            <p className="text-muted-foreground text-sm line-clamp-2">
                              {post.excerpt || "No preview available"}
                            </p>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" />
                                {getAuthorName(post.author)}
                              </span>
                              {post.publishedAt && (
                                <span className="flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {formatDistanceToNow(new Date(post.publishedAt), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {post.views !== undefined && (
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3.5 h-3.5" />
                                  {post.views}
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </Link>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </LayoutGroup>
        )}

        {/* Load More Section */}
        {pagination.hasMore && filteredPosts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center pt-8"
          >
            <button
              onClick={handleLoadMore}
              disabled={pagination.loading}
              className={cn(
                "group relative flex items-center gap-3 px-8 py-4 rounded-2xl",
                "bg-card/60 backdrop-blur-sm border border-border/50",
                "text-foreground font-medium",
                "hover:bg-card hover:border-primary/30 hover:shadow-lg",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-300"
              )}
            >
              {pagination.loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Loading more...</span>
                </>
              ) : (
                <>
                  <span>Load More Stories</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Export the wrapper
export default function NewsPageClient(props: NewsPageClientProps) {
  return (
    <FilterProvider>
      <NewsContent {...props} />
    </FilterProvider>
  );
}
