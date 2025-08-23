import { createClient } from '@supabase/supabase-js';

// Require explicit service-role configuration so uploads fail fast with a
// clear error instead of attempting to contact an invalid Supabase project.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export default supabase;
