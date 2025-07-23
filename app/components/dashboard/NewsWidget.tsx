"use client";

import { useEffect, useState } from "react";
import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { Megaphone } from "lucide-react";

interface NewsPost {
  id: string;
  title: string;
  createdAt: string;
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
    <DashboardWidget title="Latest News" icon={Megaphone}>
      {latestNews ? (
        <div>
          <h3 className="font-semibold text-base">{latestNews.title}</h3>
          <p className="text-xs text-gray-500">
            {new Date(latestNews.createdAt).toLocaleDateString()}
          </p>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No news available</p>
      )}
    </DashboardWidget>
  );
}
