import { apiClient } from './client';

export interface NewsPost {
  id: string;
  title: string;
  slug: string;
  createdAt: string;
  publishedAt: string | null;
  coverImage?: string | null;
  preview?: string;
  tags?: string[];
  pinned?: boolean;
  views?: number;
  author?: {
    name: string | null;
    email: string;
    profileImageUrl?: string | null;
  };
}

export interface NewsResponse {
  posts: NewsPost[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    page: number;
    hasMore: boolean;
  };
}

/**
 * Fetch news posts from the API
 * Uses the same endpoint as desktop - permissions are handled server-side
 */
export async function getNewsPosts(limit: number = 5, page: number = 1): Promise<NewsResponse> {
  try {
    const { data } = await apiClient.get(`/api/news?limit=${limit}&page=${page}`);
    return data;
  } catch (error: any) {
    console.error('Failed to fetch news posts:', error);
    return {
      posts: [],
      pagination: {
        total: 0,
        limit,
        offset: 0,
        page: 1,
        hasMore: false,
      },
    };
  }
}

/**
 * Fetch latest news post for dashboard widget
 */
export async function getLatestNews(): Promise<NewsPost | null> {
  try {
    const response = await getNewsPosts(1, 1);
    return response.posts[0] || null;
  } catch (error: any) {
    console.error('Failed to fetch latest news:', error);
    return null;
  }
}
