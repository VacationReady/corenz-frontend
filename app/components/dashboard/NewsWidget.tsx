"use client";

import { useEffect, useState } from "react";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { Megaphone } from "lucide-react";
import Link from "next/link";

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  createdAt: string;
  coverImage?: string | null;
  preview?: string; // ✅ Add this line
}

type NewsWidgetProps = {
  limit?: number;
};

export function NewsWidget({ limit = 1 }: NewsWidgetProps) {
  const [items, setItems] = useState<NewsPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        const res = await fetch(`/api/news?limit=${limit}`);
        const data = await res.json();
        if (Array.isArray(data)) setItems(data);
        else setItems([]);
      } catch (err) {
        console.error("Failed to fetch news", err);
        setError("Failed to load news");
      }
    };

    fetchLatestNews();
  }, [limit]);

  return (
    <DashboardWidget title="Latest News" icon={Megaphone} className="h-full">
      <div className="h-full flex flex-col justify-center">
        {!items && !error ? (
          <div className="space-y-2">
            <div className="h-4 bg-muted animate-pulse rounded" />
            <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
          </div>
        ) : error ? (
          <p className="text-center text-muted-foreground">{error}</p>
        ) : items && items.length > 0 ? (
          <ul className="space-y-4">
            {items.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/news/${post.slug}`}
                  className="hover:underline block"
                  title={post.preview ?? ""}
                >
                  <div className="flex items-start gap-3">
                    {post.coverImage ? (
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        className="w-12 h-12 rounded object-cover border"
                      />
                    ) : null}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base text-primary line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(post.createdAt).toLocaleDateString()}
                      </p>
                      {post.preview && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {post.preview}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-center text-muted-foreground">No news available</p>
        )}
      </div>
    </DashboardWidget>
  );
}

export function NewsWidgetLoading() {
  return (
    <DashboardWidget title="Latest News" icon={Megaphone} className="h-full">
      <div className="space-y-2">
        <div className="h-4 bg-muted animate-pulse rounded" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
      </div>
    </DashboardWidget>
  );
}

export function NewsWidgetError({
  message = "Failed to load news",
}: {
  message?: string;
}) {
  return (
    <DashboardWidget title="Latest News" icon={Megaphone} className="h-full">
      <p className="text-center text-muted-foreground">{message}</p>
    </DashboardWidget>
  );
}
