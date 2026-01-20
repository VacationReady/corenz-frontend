/**
 * Redis-based caching utility for document status and other frequently accessed data
 * 
 * Uses Upstash Redis REST API for distributed caching across server instances.
 * Falls back to in-memory LRU cache if Redis is unavailable.
 * 
 * @example
 * ```typescript
 * import { documentStatusCache } from '@/lib/cache';
 * 
 * // Get from cache
 * const cached = await documentStatusCache.get('doc-status:company-123:doc1,doc2');
 * 
 * // Set in cache with TTL
 * await documentStatusCache.set('doc-status:company-123:doc1,doc2', data, 60);
 * 
 * // Delete from cache
 * await documentStatusCache.delete('doc-status:company-123:doc1,doc2');
 * 
 * // Pattern-based deletion
 * await documentStatusCache.deletePattern('doc-status:company-123:*doc1*');
 * ```
 */

import "server-only";

interface CacheClient {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
    delete(key: string): Promise<void>;
    deletePattern(pattern: string): Promise<void>;
    getStats(): CacheStats;
}

interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    errors: number;
}

/**
 * Redis client using Upstash REST API
 */
class RedisCache implements CacheClient {
    private baseUrl: string;
    private token: string;
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
    };

    constructor(baseUrl: string, token: string) {
        this.baseUrl = baseUrl;
        this.token = token;
    }

    private async fetchRedis(command: string[]): Promise<any> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(this.baseUrl, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(command),
                cache: "no-store",
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!res.ok) {
                throw new Error(`Redis request failed: ${res.status} ${res.statusText}`);
            }

            const data = await res.json();
            return data.result;
        } catch (error: any) {
            this.stats.errors++;
            if (error?.name === "AbortError") {
                throw new Error("Redis request timeout");
            }
            throw error;
        }
    }

    async get<T>(key: string): Promise<T | null> {
        try {
            const result = await this.fetchRedis(["GET", key]);
            if (result === null || result === undefined) {
                this.stats.misses++;
                return null;
            }
            this.stats.hits++;
            return JSON.parse(result) as T;
        } catch (error) {
            console.warn(`Redis GET error for key ${key}:`, error);
            this.stats.misses++;
            return null;
        }
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        try {
            const serialized = JSON.stringify(value);
            await this.fetchRedis(["SETEX", key, ttlSeconds.toString(), serialized]);
            this.stats.sets++;
        } catch (error) {
            console.warn(`Redis SET error for key ${key}:`, error);
            // Don't throw - cache failures shouldn't break the API
            // Just log the error and continue
        }
    }

    async delete(key: string): Promise<void> {
        try {
            await this.fetchRedis(["DEL", key]);
            this.stats.deletes++;
        } catch (error) {
            console.warn(`Redis DELETE error for key ${key}:`, error);
            // Don't throw - cache failures shouldn't break the API
        }
    }

    async deletePattern(pattern: string): Promise<void> {
        try {
            // Use SCAN to find matching keys
            const keys = await this.scanKeys(pattern);
            if (keys.length > 0) {
                // Delete in batches of 100
                for (let i = 0; i < keys.length; i += 100) {
                    const batch = keys.slice(i, i + 100);
                    await this.fetchRedis(["DEL", ...batch]);
                    this.stats.deletes += batch.length;
                }
            }
        } catch (error) {
            console.warn(`Redis DELETE PATTERN error for pattern ${pattern}:`, error);
            // Don't throw - cache failures shouldn't break the API
        }
    }

    private async scanKeys(pattern: string): Promise<string[]> {
        const keys: string[] = [];
        let cursor = "0";

        do {
            const result = await this.fetchRedis(["SCAN", cursor, "MATCH", pattern, "COUNT", "100"]);
            cursor = result[0];
            keys.push(...result[1]);
        } while (cursor !== "0");

        return keys;
    }

    getStats(): CacheStats {
        return { ...this.stats };
    }
}

/**
 * In-memory LRU cache fallback
 */
class MemoryCache implements CacheClient {
    private cache = new Map<string, { value: any; expires: number }>();
    private maxSize: number;
    private stats: CacheStats = {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0,
        errors: 0,
    };

    constructor(maxSize: number = 1000) {
        this.maxSize = maxSize;
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);
        const now = Date.now();

        if (!entry || entry.expires < now) {
            this.stats.misses++;
            if (entry) {
                this.cache.delete(key);
            }
            return null;
        }

        this.stats.hits++;
        // Move to end (LRU)
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value as T;
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        // Evict oldest if at capacity
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            value,
            expires: Date.now() + ttlSeconds * 1000,
        });
        this.stats.sets++;
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key);
        this.stats.deletes++;
    }

    async deletePattern(pattern: string): Promise<void> {
        // Convert glob pattern to regex
        const regexPattern = pattern
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".");
        const regex = new RegExp(`^${regexPattern}$`);

        const keysToDelete: string[] = [];
        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            this.cache.delete(key);
            this.stats.deletes++;
        }
    }

    getStats(): CacheStats {
        return { ...this.stats };
    }
}

/**
 * Initialize cache client based on environment
 */
export function createCacheClient(): CacheClient {
    const baseUrl =
        process.env.KV_REST_API_URL || 
        process.env.UPSTASH_REDIS_REST_URL ||
        process.env.REDIS_URL;
    const token =
        process.env.KV_REST_API_TOKEN || 
        process.env.UPSTASH_REDIS_REST_TOKEN;

    if (baseUrl && token) {
        console.log("✅ Using Redis cache (Upstash)");
        return new RedisCache(baseUrl, token);
    }

    console.warn("⚠️  Redis not configured, using in-memory cache");
    return new MemoryCache(1000);
}

/**
 * Document status cache instance
 * 
 * TTL: 60 seconds
 * Key format: doc-status:{companyId}:{employeeId}:{sortedDocIds}
 */
export const documentStatusCache = createCacheClient();

/**
 * Helper to generate cache key for document status
 */
export function generateDocumentStatusCacheKey(
    companyId: string,
    employeeId: string,
    documentIds: string[]
): string {
    // Sort IDs to ensure consistent cache keys
    const sortedIds = [...documentIds].sort();
    return `doc-status:${companyId}:${employeeId}:${sortedIds.join(",")}`;
}

/**
 * Helper to invalidate all document status cache entries for a specific document
 * If employeeId is provided, only invalidates that employee's cache entries
 */
export async function invalidateDocumentStatusCache(
    companyId: string,
    documentId: string,
    employeeId?: string
): Promise<void> {
    const employeePattern = employeeId ?? '*';
    const pattern = `doc-status:${companyId}:${employeePattern}:*${documentId}*`;
    await documentStatusCache.deletePattern(pattern);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
    return documentStatusCache.getStats();
}
