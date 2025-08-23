import { createClient } from '@supabase/supabase-js';

// Allow the admin client to fall back to the public env vars if the
// service-role variables are not provided. This prevents runtime failures
// during onboarding uploads when only the public keys are configured.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
