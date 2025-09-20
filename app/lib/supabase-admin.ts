// /app/lib/supabase-admin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

// Prefer service role, fall back to public if not available
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

