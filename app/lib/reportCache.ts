/**
 * Report Query Cache
 * 
 * Server-side caching for report queries to improve performance
 * and reduce database load for repeated report executions.
 * 
 * Features:
 * - In-memory LRU cache with configurable TTL
 * - Cache key generation based on query parameters
 * - Automatic cache invalidation on TTL expiry
 * - Cache statistics for monitoring
 * - Support for company-scoped caching
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  hits: number;
  companyId: string;
}

interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  avgResponseTimeMs: number;
}

interface ReportQueryCacheOptions {
  /** Maximum number of entries to cache (default: 500) */
  maxSize?: number;
  /** Time-to-live in milliseconds (default: 60000 - 1 minute) */
  ttl?: number;
  /** Enable cache logging (default: false) */
  debug?: boolean;
}

class ReportQueryCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private maxSize: number;
  private ttl: number;
  private debug: boolean;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
    totalResponseTime: number;
    responseCount: number;
  };

  constructor(options: ReportQueryCacheOptions = {}) {
    this.cache = new Map();
    this.maxSize = options.maxSize ?? 500;
    this.ttl = options.ttl ?? 60000; // 1 minute default
    this.debug = options.debug ?? false;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalResponseTime: 0,
      responseCount: 0,
    };
  }

  /**
   * Generate a unique cache key for a report query
   */
  generateKey(params: {
    selectedFields: string[];
    filters?: unknown;
    filterGroup?: unknown;
    pagination?: { page?: number; limit?: number };
    sort?: { field: string; direction: string } | null;
    companyId: string;
  }): string {
    const normalizedParams = {
      fields: [...params.selectedFields].sort(),
      filters: params.filters,
      filterGroup: params.filterGroup,
      page: params.pagination?.page ?? 1,
      limit: params.pagination?.limit ?? 50,
      sort: params.sort ? `${params.sort.field}:${params.sort.direction}` : null,
      companyId: params.companyId,
    };

    return this.hashObject(normalizedParams);
  }

  /**
   * Simple hash function for objects
   */
  private hashObject(obj: unknown): string {
    const str = JSON.stringify(obj);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `report_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Get cached result if available and not expired
   */
  get<T>(key: string, companyId: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      if (this.debug) {
        console.log(`[ReportCache] MISS: ${key}`);
      }
      return null;
    }

    // Verify company scope
    if (entry.companyId !== companyId) {
      this.stats.misses++;
      if (this.debug) {
        console.log(`[ReportCache] MISS (company mismatch): ${key}`);
      }
      return null;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      if (this.debug) {
        console.log(`[ReportCache] EXPIRED: ${key}`);
      }
      return null;
    }

    // Update hit count
    entry.hits++;
    this.stats.hits++;

    if (this.debug) {
      console.log(`[ReportCache] HIT: ${key} (hits: ${entry.hits})`);
    }

    return entry.data as T;
  }

  /**
   * Store result in cache
   */
  set<T>(key: string, data: T, companyId: string): void {
    // Evict oldest entries if at capacity
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
      companyId,
    });

    if (this.debug) {
      console.log(`[ReportCache] SET: ${key} (size: ${this.cache.size})`);
    }
  }

  /**
   * Evict the oldest entry
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
      if (this.debug) {
        console.log(`[ReportCache] EVICTED: ${oldestKey}`);
      }
    }
  }

  /**
   * Invalidate cache entries for a specific company
   */
  invalidateCompany(companyId: string): number {
    let count = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.companyId === companyId) {
        this.cache.delete(key);
        count++;
      }
    }
    if (this.debug) {
      console.log(`[ReportCache] INVALIDATED ${count} entries for company ${companyId}`);
    }
    return count;
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    const size = this.cache.size;
    this.cache.clear();
    if (this.debug) {
      console.log(`[ReportCache] CLEARED ${size} entries`);
    }
  }

  /**
   * Delete a specific cache entry
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (this.debug) {
      console.log(`[ReportCache] DELETE: ${key} (${deleted ? 'success' : 'not found'})`);
    }
    return deleted;
  }

  /**
   * Check if a key exists and is valid
   */
  has(key: string, companyId: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (entry.companyId !== companyId) return false;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Record response time for statistics
   */
  recordResponseTime(ms: number): void {
    this.stats.totalResponseTime += ms;
    this.stats.responseCount++;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      avgResponseTimeMs: this.stats.responseCount > 0
        ? Math.round(this.stats.totalResponseTime / this.stats.responseCount)
        : 0,
    };
  }

  /**
   * Get hit rate percentage
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) return 0;
    return Math.round((this.stats.hits / total) * 100);
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (this.debug && cleaned > 0) {
      console.log(`[ReportCache] CLEANUP: removed ${cleaned} expired entries`);
    }

    return cleaned;
  }

  /**
   * Get all cache keys (for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Singleton instance for the application
export const reportQueryCache = new ReportQueryCache({
  maxSize: 500,
  ttl: 60000, // 1 minute
  debug: process.env.NODE_ENV === "development",
});

// Schedule periodic cleanup (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    reportQueryCache.cleanup();
  }, 5 * 60 * 1000);
}

/**
 * Wrapper function for cached report queries
 */
export async function cachedReportQuery<T>(
  params: {
    selectedFields: string[];
    filters?: unknown;
    filterGroup?: unknown;
    pagination?: { page?: number; limit?: number };
    sort?: { field: string; direction: string } | null;
    companyId: string;
  },
  queryFn: () => Promise<T>
): Promise<{ data: T; cached: boolean; responseTimeMs: number }> {
  const startTime = Date.now();
  const cacheKey = reportQueryCache.generateKey(params);

  // Try to get from cache
  const cached = reportQueryCache.get<T>(cacheKey, params.companyId);
  if (cached !== null) {
    const responseTime = Date.now() - startTime;
    reportQueryCache.recordResponseTime(responseTime);
    return { data: cached, cached: true, responseTimeMs: responseTime };
  }

  // Execute query
  const data = await queryFn();
  const responseTime = Date.now() - startTime;
  reportQueryCache.recordResponseTime(responseTime);

  // Store in cache
  reportQueryCache.set(cacheKey, data, params.companyId);

  return { data, cached: false, responseTimeMs: responseTime };
}

/**
 * Export cache utilities
 */
export const cacheUtils = {
  generateKey: (params: Parameters<typeof reportQueryCache.generateKey>[0]) =>
    reportQueryCache.generateKey(params),
  invalidateCompany: (companyId: string) =>
    reportQueryCache.invalidateCompany(companyId),
  invalidateAll: () => reportQueryCache.invalidateAll(),
  getStats: () => reportQueryCache.getStats(),
  getHitRate: () => reportQueryCache.getHitRate(),
  cleanup: () => reportQueryCache.cleanup(),
};

export default reportQueryCache;




