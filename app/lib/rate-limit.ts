// Simple in-memory rate limiter with optional Vercel KV backing.
// Returns true if the provided key has exceeded the rate limit.

export interface RateLimitOptions {
  /** maximum number of requests */
  limit: number;
  /** time window in milliseconds */
  windowMs: number;
}

interface Entry {
  count: number;
  expires: number;
}

const memoryStore = new Map<string, Entry>();
let kvClient:
  | {
      incr(key: string): Promise<number>;
      expire(key: string, ttl: number): Promise<void>;
    }
  | null = null;

async function getKV() {
  if (kvClient) return kvClient;

  const url =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    // @ts-ignore - optional dependency
    const { createClient } = await import("@vercel/kv");
    kvClient = createClient({ url, token });
  } catch {
    kvClient = null;
  }
  return kvClient;
}

export async function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): Promise<boolean> {
  const kv = await getKV();
  if (kv) {
    const count = await kv.incr(key);
    if (count === 1) {
      await kv.expire(key, Math.ceil(windowMs / 1000));
    }
    return count > limit;
  }

  const now = Date.now();
  const entry = memoryStore.get(key);
  if (!entry || entry.expires < now) {
    memoryStore.set(key, { count: 1, expires: now + windowMs });
    return false;
  }
  if (entry.count >= limit) {
    return true;
  }
  entry.count += 1;
  return false;
}
