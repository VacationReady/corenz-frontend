// Simple in-memory rate limiter with optional KV backing via REST calls.
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
interface KVClient {
  incr(key: string): Promise<number>;
  expire(key: string, ttl: number): Promise<void>;
}

let kvClient: KVClient | null = null;

async function getKV(): Promise<KVClient | null> {
  if (kvClient) return kvClient;

  const baseUrl =
    process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!baseUrl || !token) return null;

  const headers = { Authorization: `Bearer ${token}` };
  const fetchJson = async (path: string) => {
    const res = await fetch(`${baseUrl}/${path}`, { headers, cache: "no-store" });
    if (!res.ok) throw new Error("KV request failed");
    return res.json();
  };

  kvClient = {
    async incr(key: string) {
      const data = await fetchJson(`incr/${encodeURIComponent(key)}`);
      return typeof data.result === "number" ? data.result : parseInt(data.result, 10);
    },
    async expire(key: string, ttl: number) {
      await fetchJson(`expire/${encodeURIComponent(key)}/${ttl}`);
    },
  };

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
