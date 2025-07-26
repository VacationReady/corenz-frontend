import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function uploadToSupabase(file: File) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `documents/${fileName}`;

  const { data, error } = await supabase.storage
    .from('documents') // bucket must be called 'documents'
    .upload(filePath, file);

  if (error) throw new Error(error.message);

  const publicUrlData = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return {
    url: publicUrlData.publicUrl, // ✅ corrected here
    path: filePath,
  };
}
