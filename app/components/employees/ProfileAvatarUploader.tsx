"use client";

import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { uploadToSupabase } from "@/lib/supabase";
import Button from "@/components/ui/Button";
import { toast } from "sonner";

type Props = {
  userId: string;
  name: string;
  initialUrl?: string | null;
  initialPath?: string | null;
};

export default function ProfileAvatarUploader({
  userId,
  name,
  initialUrl,
  initialPath,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [url, setUrl] = useState<string | undefined | null>(initialUrl);
  const [isUploading, setIsUploading] = useState(false);

  const handleClick = () => inputRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/users/${userId}/profile-image/upload`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setUrl(json.url);
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error("Failed to upload profile photo");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // Client fallback: if we only have a storage path, request a signed URL
  // Useful if server-side signing failed or the URL expired between SSR and hydration
  React.useEffect(() => {
    let cancelled = false;
    async function ensureSigned() {
      if (!url && initialPath) {
        try {
          const res = await fetch(`/api/storage/sign?path=${encodeURIComponent(initialPath)}`, { cache: "no-store" });
          if (!res.ok) return;
          const json = await res.json();
          if (!cancelled) setUrl(json.url || null);
        } catch {}
      }
    }
    ensureSigned();
    return () => {
      cancelled = true;
    };
  }, [url, initialPath]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <Avatar
          src={url || undefined}
          name={name}
          className="bg-muted"
          size={96}
        />
        <Button
          type="button"
          onClick={handleClick}
          className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full p-0 flex items-center justify-center"
          variant="secondary"
          disabled={isUploading}
          aria-label="Upload profile photo"
        >
          <Camera className="h-4 w-4" />
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onFileChange}
        />
      </div>
    </div>
  );
}
