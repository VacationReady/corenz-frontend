// /lib/getDownloadUrl.ts

import supabase from "./supabase-admin";

export async function getDownloadUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(path, 60 * 5); // URL valid for 5 minutes

  if (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }

  return data?.signedUrl ?? null;
}
