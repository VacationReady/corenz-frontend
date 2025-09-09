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
  preview?: string; // ✅ Add this line
}

export function NewsWidget() {
  const [latestNews, setLatestNews] = useState<NewsPost | null>(null);

  useEffect(() => {
    const fetchLatestNews = async () => {
      try {
        const res = await fetch("/api/news?limit=1");
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLatestNews(data[0]);
        }
      } catch (err) {
        console.error("Failed to fetch news", err);
      }
    };

    fetchLatestNews();
  }, []);

  return (
  <DashboardWidget title="Latest News" icon={Megaphone} className="h-full">
    <div className="h-full flex flex-col justify-center">
      {latestNews ? (
        <div className="space-y-3">
          <Link
            href={`/news/${latestNews.slug}`}
            className="hover:underline block"
            title={latestNews.preview ?? ""}
          >
            <h3 className="font-semibold text-base text-primary line-clamp-3">
              {latestNews.title}
            </h3>
          </Link>
          <p className="text-sm text-muted-foreground">
            {new Date(latestNews.createdAt).toLocaleDateString()}
          </p>
          {latestNews.preview && (
            <p className="text-sm text-muted-foreground line-clamp-4">
              {latestNews.preview}
            </p>
          )}
        </div>
      ) : (
        <p className="text-center text-muted-foreground">No news available</p>
      )}
    </div>
  </DashboardWidget>
);
}
