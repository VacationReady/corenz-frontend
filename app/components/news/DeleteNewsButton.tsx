"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  slug: string;
  variant?: "default" | "icon";
}

export default function DeleteNewsButton({ slug, variant = "default" }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setLoading(true);

    const res = await fetch(`/api/news/${slug}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Post deleted successfully");
      router.push("/news");
    } else {
      toast.error("Failed to delete post");
      setLoading(false);
    }
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleDelete}
        disabled={loading}
        className={cn(
          "p-2 rounded-full transition-all",
          "bg-white/10 backdrop-blur-md text-white",
          "hover:bg-red-500/20 hover:text-red-300",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
        title="Delete post"
      >
        {loading ? (
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
    >
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}
