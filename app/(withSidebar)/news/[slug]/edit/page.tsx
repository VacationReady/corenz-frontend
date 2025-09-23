"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Input } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { Switch } from "@/components/ui/switch";
import { uploadFileToSupabase } from "@/lib/news/uploadFileToSupabase";
import dynamic from "next/dynamic";
import AudienceSelector from "@/components/news/AudienceSelector";
import { SectionSkeleton } from "@/components/ui/PageSkeleton";

const NewsContentBuilder = dynamic(
  () => import("@/components/news/NewsContentBuilder"),
  { ssr: false },
);

type ContentBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet_list"; items: string[] };

interface Props {
  params: { slug: string };
}

export default function EditNewsPostPage({ params }: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState<ContentBlock[]>([]);
  const [videoUrl, setVideoUrl] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [audience, setAudience] = useState<{
    type?: "all";
    departments?: string[];
    roles?: string[];
    locations?: string[];
  }>({ type: "all" });

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) return router.push("/news");

    async function fetchPost() {
      const res = await fetch(`/api/news/${params.slug}`);
      if (!res.ok) return router.push("/news");

      const post = await res.json();

      if (!post) return router.push("/news");

      const isAdmin = session?.user?.role === "ADMIN";
      const isAuthor = session?.user?.id === post.authorId;

      if (!isAdmin && !isAuthor) return router.push("/news");

      setTitle(post.title);
      setContent(post.content || []);
      setVideoUrl(post.videoEmbedUrl || "");
      setExistingFiles(post.attachments || []);
      setSendEmail(post.sendEmail || false);
      setAudience(post.audience || { type: "all" });
      setLoading(false);
    }

    fetchPost();
  }, [params.slug, router, session, status]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const uploadedUrls = await Promise.all(
      attachments.map((file) => uploadFileToSupabase(file)),
    );

    const res = await fetch(`/api/news/${params.slug}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content,
        videoEmbedUrl: videoUrl,
        attachments: [...existingFiles, ...uploadedUrls],
        sendEmail,
        audience,
      }),
    });

    if (res.ok) {
      router.push(`/news/${params.slug}`);
    } else {
      alert("Failed to update news post.");
    }
  };

  if (loading || status === "loading")
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <SectionSkeleton
          showContainer={false}
          rows={1}
          lineClassName="h-9 w-2/3"
        />
        <SectionSkeleton
          showContainer={false}
          rows={1}
          lineClassName="h-64 w-full rounded-xl"
        />
        <SectionSkeleton showContainer={false} rows={4} />
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">Edit News Post</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Content</label>
          <NewsContentBuilder value={content} onChange={setContent} />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Video Embed URL (optional)
          </label>
          <Input
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Add Attachments
          </label>
          <Input type="file" multiple onChange={handleFileChange} />
        </div>

        {existingFiles.length > 0 && (
          <div className="text-sm text-muted-foreground">
            <p>Existing files:</p>
            <ul className="list-disc pl-5">
              {existingFiles.map((url, i) => (
                <li key={i}>{url.split("/").pop()}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <AudienceSelector
            value={audience}
            onChange={setAudience}
            refreshKey={0}
          />
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={sendEmail} onChange={setSendEmail} />
          <span className="text-sm">Send email notification</span>
        </div>

        <Button type="submit">Update News</Button>
      </form>
    </div>
  );
}
