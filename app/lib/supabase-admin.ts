// /app/lib/supabase-admin.ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

// Prefer service role, fall back to public if not available
const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase configuration");
}

// Admin client (safe only on the server)
const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
