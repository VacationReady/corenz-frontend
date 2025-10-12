// /app/lib/supabase-admin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, features } from "@/lib/env.server";

// Prefer service role, fall back to public if not available
const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any;
if (!supabaseUrl || !supabaseKey) {
  // Test shim: expose minimal interface used in code
  supabase = {
    storage: {
      from() {
        return {
          remove: async () => ({ data: null, error: null }),
          upload: async () => ({ data: null, error: null }),
          createSignedUrl: async () => ({ data: null, error: null }),
        } as any;
      },
    },
  } as any;
} else {
  // Admin client (safe only on the server)
  supabase = createClient(supabaseUrl, supabaseKey);
}

export default supabase;

