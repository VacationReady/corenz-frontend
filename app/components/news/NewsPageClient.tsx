"use client";

import { useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import Button from '@/components/ui/Button';
import { PageShell } from '@/components/ui/PageShell';
import { FilterProvider, useFilters } from '@/components/ui/FilterProvider';
import { FilterBar } from '@/components/ui/FilterBar';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { Megaphone } from 'lucide-react';
import { FilterOption } from '@/types/filter';

// ✅ Props interface matches server-provided props
interface NewsPost {
  id: string;
  title: string;
  slug: string;
  content: any;
  authorId: string;
  author: {
    name: string | null;
    email: string;
  };
  publishedAt: string | null;
  pinned: boolean;
  tags: string[];
  createdAt: string;
}

interface NewsPageClientProps {
  posts: NewsPost[];
  canPost: boolean;
}

function NewsContent({ posts, canPost }: NewsPageClientProps) {
  const { filters } = useFilters();
  const breadcrumbs = useBreadcrumbs();

  // ✅ Unified author name formatter
  const getAuthorName = (author: NewsPost["author"]) =>
    author?.name || author?.email || 'Unknown Author';

  // Filter options
  const authorOptions: FilterOption[] = useMemo(() => {
    const authors = [...new Set(posts.map(post => getAuthorName(post.author)))];
    return [{ label: "All Authors", value: "all" }, ...authors.map(author => ({ label: author, value: author }))];
  }, [posts]);

  const tagOptions: FilterOption[] = useMemo(() => {
    const tags = [...new Set(posts.flatMap(post => post.tags))];
    return [{ label: "All Tags", value: "all" }, ...tags.map(tag => ({ label: tag, value: tag }))];
  }, [posts]);

  const sortOptions: FilterOption[] = [
    { label: "Date", value: "date" },
    { label: "Title", value: "title" },
    { label: "Author", value: "author" },
  ];

  // Filter & sort posts
  const filteredPosts = useMemo(() => {
    let filtered = [...posts];

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        post =>
          post.title.toLowerCase().includes(searchLower) ||
          getAuthorName(post.author).toLowerCase().includes(searchLower) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchLower))
      );
    }

    if (filters.authors.length > 0 && !filters.authors.includes("all")) {
      filtered = filtered.filter(post => filters.authors.includes(getAuthorName(post.author)));
    }

    if (filters.categories.length > 0 && !filters.categories.includes("all")) {
      filtered = filtered.filter(post => post.tags.some(tag => filters.categories.includes(tag)));
    }

    if (filters.sortBy) {
      filtered.sort((a, b) => {
        let aValue = "", bValue = "";
        switch (filters.sortBy) {
          case "title":
            aValue = a.title;
            bValue = b.title;
            break;
          case "author":
            aValue = getAuthorName(a.author);
            bValue = getAuthorName(b.author);
            break;
          case "date":
            aValue = a.publishedAt || a.createdAt;
            bValue = b.publishedAt || b.createdAt;
            break;
        }
        const comparison = aValue.localeCompare(bValue);
        return filters.sortOrder === "desc" ? -comparison : comparison;
      });
    }

    return filtered.sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
  }, [posts, filters]);

  // Export CSV
  const handleExport = () => {
    const csvContent = [
      ["Title", "Author", "Published Date", "Tags", "Pinned"],
      ...filteredPosts.map(post => [
        post.title,
        getAuthorName(post.author),
        post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : "Draft",
        post.tags.join("; "),
        post.pinned ? "Yes" : "No",
      ]),
    ]
      .map(row => row.map(field => `"${field}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `news-posts-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <PageShell
      title="Company News"
      description="Stay updated with the latest company announcements"
      icon={<Megaphone className="w-6 h-6" />}
      breadcrumbs={breadcrumbs || undefined}
      action={
        canPost ? (
          <Link href="/news/create">
            <Button variant="primary">Create News</Button>
          </Link>
        ) : undefined
      }
    >
      {/* Filter Bar */}
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

      {/* News List */}
      <div className="max-w-4xl mx-auto space-y-6">
        {filteredPosts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {filters.search || filters.authors.length > 0 || filters.categories.length > 0
              ? "No news posts match your current filters."
              : "No news posts found."}
          </div>
        ) : (
          filteredPosts.map((post) => (
            <Link key={post.id} href={`/news/${post.slug}`}>
              <div className="bg-card rounded-xl shadow-lg border border-enhanced p-6 hover:shadow-enterprise transition-smooth hover-lift">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-foreground hover:text-primary transition-smooth">
                      {post.title}
                    </h2>
                    {post.pinned && (
                      <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                        Pinned
                      </span>
                    )}
                  </div>
                  {post.publishedAt && (
                    <span className="text-sm text-muted-foreground bg-section-background px-3 py-1 rounded-full">
                      {format(new Date(post.publishedAt), 'dd MMM yyyy')}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>By {getAuthorName(post.author)}</span>
                  {post.tags.length > 0 && (
                    <div className="flex gap-2">
                      {post.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="bg-muted px-2 py-1 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                      {post.tags.length > 3 && (
                        <span className="text-xs">+{post.tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
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
