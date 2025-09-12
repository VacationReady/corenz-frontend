import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export async function uploadToSupabase(file: File) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `documents/${fileName}`;

  const { data, error } = await supabase.storage
    .from("documents")
    .upload(filePath, file);

  if (error) throw new Error(error.message);

  const publicUrlResponse = supabase.storage
    .from("documents")
    .getPublicUrl(filePath);

  if (!publicUrlResponse.data?.publicUrl) {
    throw new Error("Failed to get public URL from Supabase");
  }

  return {
    url: publicUrlResponse.data.publicUrl,
    path: filePath,
  };
}
