/**
 * News utility functions for sharing, pagination, and other news-related operations
 */

import { toast } from "sonner";

export interface ShareOptions {
  title: string;
  text?: string;
  url: string;
}

/**
 * Record a share action via API and handle sharing via Web Share API or clipboard
 * @param slug - The news post slug
 * @param options - Share options (title, text, url)
 * @returns Promise<boolean> - Returns true if share was successful
 */
export async function handleNewsShare(
  slug: string,
  options: ShareOptions
): Promise<boolean> {
  try {
    // Record the share action
    const response = await fetch(`/api/news/${slug}/share`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error("Failed to record share");
    }

    // Try Web Share API first (mobile/modern browsers)
    if (navigator.share) {
      try {
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url,
        });
        toast.success("Shared successfully!");
        return true;
      } catch (error: any) {
        // User cancelled or share failed
        if (error.name !== "AbortError") {
          console.error("Share failed:", error);
          // Fall back to clipboard
        } else {
          // User cancelled, don't show error
          return false;
        }
      }
    }

    // Fallback: Copy to clipboard
    await navigator.clipboard.writeText(options.url);
    toast.success("Link copied to clipboard!");
    return true;
  } catch (error) {
    console.error("Share error:", error);
    toast.error("Failed to share. Please try again.");
    return false;
  }
}

/**
 * Generate the full public URL for a news post
 * @param slug - The news post slug
 * @returns The full URL
 */
export function getNewsPostUrl(slug: string): string {
  if (typeof window === "undefined") {
    return `${process.env.NEXT_PUBLIC_APP_URL || ""}/news/${slug}`;
  }
  return `${window.location.origin}/news/${slug}`;
}

/**
 * Format share text for a news post
 * @param title - Post title
 * @param excerpt - Optional excerpt
 * @returns Formatted share text
 */
export function formatShareText(title: string, excerpt?: string): string {
  if (excerpt) {
    return `${title} - ${excerpt}`;
  }
  return title;
}

export interface PaginationState {
  page: number;
  limit: number;
  hasMore: boolean;
  loading: boolean;
}

/**
 * Fetch more news posts with pagination
 * @param page - Page number to fetch
 * @param limit - Number of posts per page
 * @returns Promise with posts and pagination data
 */
export async function fetchNewsPage(
  page: number,
  limit: number = 12
): Promise<{
  posts: any[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    page: number;
    hasMore: boolean;
  };
}> {
  const response = await fetch(
    `/api/news?page=${page}&limit=${limit}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch news posts");
  }

  return response.json();
}

/**
 * Create a shareable object for a news post
 * @param post - News post object
 * @returns ShareOptions object
 */
export function createShareOptions(post: {
  slug: string;
  title: string;
  excerpt?: string;
}): ShareOptions {
  return {
    title: post.title,
    text: formatShareText(post.title, post.excerpt),
    url: getNewsPostUrl(post.slug),
  };
}
