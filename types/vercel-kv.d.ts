declare module "@vercel/kv" {
  export const kv: {
    incr(key: string): Promise<number>;
    expire(key: string, ttlSeconds: number): Promise<void>;
  };
  export function createClient(config: {
    url: string;
    token: string;
  }): {
    incr(key: string): Promise<number>;
    expire(key: string, ttlSeconds: number): Promise<void>;
  };
}

