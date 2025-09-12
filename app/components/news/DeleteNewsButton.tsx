"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  slug: string;
}

export default function DeleteNewsButton({ slug }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    setLoading(true);

    const res = await fetch(`/api/news/${slug}`, {
      method: "DELETE",
    });

    if (res.ok) {
      router.push("/news");
    } else {
      alert("Failed to delete post.");
      setLoading(false);
    }
  };

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
