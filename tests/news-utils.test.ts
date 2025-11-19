import "./setupEnv";
/**
 * Unit tests for news utility functions
 * Tests share functionality, pagination, and URL generation
 * 
 * NOTE: This test uses Vitest but the project uses Node.js test runner.
 * Skipping until migrated to node:test.
 */

// File temporarily disabled - needs migration from Vitest to node:test
/*
import {
  handleNewsShare,
  getNewsPostUrl,
  formatShareText,
  fetchNewsPage,
  createShareOptions,
} from "../app/lib/news-utils";

// Mock global fetch
global.fetch = vi.fn();

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("News Utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getNewsPostUrl", () => {
    it("should generate correct URL in browser environment", () => {
      // Mock window.location
      Object.defineProperty(window, "location", {
        value: { origin: "https://example.com" },
        writable: true,
      });

      const url = getNewsPostUrl("test-slug");
      expect(url).toBe("https://example.com/news/test-slug");
    });

    it("should use env variable in server environment", () => {
      // Mock server environment
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;

      process.env.NEXT_PUBLIC_APP_URL = "https://server.com";
      const url = getNewsPostUrl("test-slug");
      expect(url).toBe("https://server.com/news/test-slug");

      // Restore window
      global.window = originalWindow;
    });
  });

  describe("formatShareText", () => {
    it("should format text with title only", () => {
      const text = formatShareText("My News Post");
      expect(text).toBe("My News Post");
    });

    it("should format text with title and excerpt", () => {
      const text = formatShareText("My News Post", "This is an excerpt");
      expect(text).toBe("My News Post - This is an excerpt");
    });

    it("should handle empty excerpt", () => {
      const text = formatShareText("My News Post", "");
      expect(text).toBe("My News Post");
    });
  });

  describe("createShareOptions", () => {
    it("should create share options with all fields", () => {
      const post = {
        slug: "test-post",
        title: "Test Post Title",
        excerpt: "Test excerpt content",
      };

      Object.defineProperty(window, "location", {
        value: { origin: "https://example.com" },
        writable: true,
      });

      const options = createShareOptions(post);

      expect(options).toEqual({
        title: "Test Post Title",
        text: "Test Post Title - Test excerpt content",
        url: "https://example.com/news/test-post",
      });
    });

    it("should create share options without excerpt", () => {
      const post = {
        slug: "test-post",
        title: "Test Post Title",
      };

      Object.defineProperty(window, "location", {
        value: { origin: "https://example.com" },
        writable: true,
      });

      const options = createShareOptions(post);

      expect(options).toEqual({
        title: "Test Post Title",
        text: "Test Post Title",
        url: "https://example.com/news/test-post",
      });
    });
  });

  describe("handleNewsShare", () => {
    beforeEach(() => {
      // Mock navigator.clipboard
      Object.assign(navigator, {
        clipboard: {
          writeText: vi.fn().mockResolvedValue(undefined),
        },
      });
    });

    it("should record share and copy to clipboard when Web Share API is not available", async () => {
      // Mock successful API call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const options = {
        title: "Test Post",
        text: "Test text",
        url: "https://example.com/news/test",
      };

      const result = await handleNewsShare("test-post", options);

      expect(global.fetch).toHaveBeenCalledWith("/api/news/test-post/share", {
        method: "POST",
      });
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(options.url);
      expect(result).toBe(true);
    });

    it("should use Web Share API when available", async () => {
      // Mock Web Share API
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.assign(navigator, {
        share: mockShare,
        clipboard: {
          writeText: vi.fn(),
        },
      });

      // Mock successful API call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const options = {
        title: "Test Post",
        text: "Test text",
        url: "https://example.com/news/test",
      };

      const result = await handleNewsShare("test-post", options);

      expect(mockShare).toHaveBeenCalledWith(options);
      expect(result).toBe(true);
    });

    it("should handle API errors gracefully", async () => {
      // Mock failed API call
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const options = {
        title: "Test Post",
        text: "Test text",
        url: "https://example.com/news/test",
      };

      const result = await handleNewsShare("test-post", options);

      expect(result).toBe(false);
    });

    it("should handle user cancellation in Web Share API", async () => {
      // Mock Web Share API with user cancellation
      const mockShare = vi.fn().mockRejectedValue({ name: "AbortError" });
      Object.assign(navigator, {
        share: mockShare,
      });

      // Mock successful API call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const options = {
        title: "Test Post",
        text: "Test text",
        url: "https://example.com/news/test",
      };

      const result = await handleNewsShare("test-post", options);

      expect(result).toBe(false);
    });
  });

  describe("fetchNewsPage", () => {
    it("should fetch news with correct pagination parameters", async () => {
      const mockResponse = {
        posts: [
          { id: "1", title: "Post 1" },
          { id: "2", title: "Post 2" },
        ],
        pagination: {
          total: 24,
          limit: 12,
          offset: 12,
          page: 2,
          hasMore: true,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchNewsPage(2, 12);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/news?page=2&limit=12",
        expect.objectContaining({
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it("should use default limit if not provided", async () => {
      const mockResponse = {
        posts: [],
        pagination: {
          total: 0,
          limit: 12,
          offset: 0,
          page: 1,
          hasMore: false,
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await fetchNewsPage(1);

      expect(global.fetch).toHaveBeenCalledWith(
        "/api/news?page=1&limit=12",
        expect.any(Object)
      );
    });

    it("should throw error on failed fetch", async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(fetchNewsPage(1, 12)).rejects.toThrow(
        "Failed to fetch news posts"
      );
    });

    it("should handle network errors", async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

      await expect(fetchNewsPage(1, 12)).rejects.toThrow("Network error");
    });
  });
});
*/
