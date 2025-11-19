// /lib/getDownloadUrl.ts

import { getSignedProfileUrl } from "@/lib/storage/signProfiles";

export async function getDownloadUrl(path: string) {
  // Delegate to the shared helper so we benefit from the same caching logic
  // and a single implementation for Supabase signed URL generation.
  try {
    return await getSignedProfileUrl(path);
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return null;
  }
}

