import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import NewsDetailClient from "@/components/news/NewsDetailClient";
import supabase from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function NewsDetailPage(context: { params: { slug: string } }) {
  const { slug } = context.params;
  const session = await getServerSession(authOptions);

  const post = await prisma.newsPost.findFirst({
    where: {
      slug,
      ...(session?.user?.companyId
        ? { User: { is: { companyId: session.user.companyId } } }
        : {}),
    },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true,
          role: true,
        },
      },
      reactions: {
        select: {
          reaction: true,
          userId: true,
        },
      },
      bookmarks: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!post) return notFound();

  // Fetch related posts
  const relatedPosts = await prisma.newsPost.findMany({
    where: {
      id: { not: post.id },
      ...(session?.user?.companyId
        ? { User: { is: { companyId: session.user.companyId } } }
        : {}),
      OR: [{ tags: { hasSome: post.tags } }, { authorId: post.authorId }],
    },
    take: 3,
    include: {
      User: {
        select: {
          name: true,
          email: true,
          profileImageUrl: true,
        },
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  const isAuthor = session?.user?.id === post.authorId;
  const isAdmin =
    session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const canEdit = isAuthor || isAdmin;

  // Transform the post data to match client expectations
  let coverImageFromPost: string | null = (post as any).coverImageUrl ?? (post as any).coverImage ?? null;
  // Ensure we have a fresh signed URL regardless of how it was stored
  if (coverImageFromPost) {
    if (/^https?:\/\//i.test(coverImageFromPost) && coverImageFromPost.includes("/object/sign/") && coverImageFromPost.includes("/documents/")) {
      try {
        const after = coverImageFromPost.split("/documents/")[1] || "";
        const path = after.split("?")[0] || "";
        if (path) {
          const { data, error } = await supabase.storage
            .from("documents")
            .createSignedUrl(path, 60 * 10);
          if (!error) coverImageFromPost = data?.signedUrl ?? coverImageFromPost;
        }
      } catch {}
    } else if (!/^https?:\/\//i.test(coverImageFromPost)) {
      try {
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(coverImageFromPost, 60 * 10);
        if (!error) coverImageFromPost = data?.signedUrl ?? coverImageFromPost;
      } catch {}
    }
  }
  const { coverImageUrl, coverImage, ...postRest } = post as any;

  const reactionCounts = post.reactions.reduce<Record<string, number>>(
    (acc, reaction) => {
      acc[reaction.reaction] = (acc[reaction.reaction] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const transformedPost = {
    ...postRest,
    coverImage: coverImageFromPost ?? null,
    author: {
      id: post.User.id,
      name: post.User.name,
      email: post.User.email,
      avatar: post.User.profileImageUrl,
      role: post.User.role,
    },
    content: post.content as any,
    attachments: post.attachments as string[],
    audience: post.audience as any,
    readTime: Math.ceil(
      JSON.stringify(post.content).split(" ").length / 200
    ), // Estimate read time
    reactions: reactionCounts,
    views: post.viewCount,
    bookmarkCount: post.bookmarks.length,
    isBookmarked: post.bookmarks.some(
      (bookmark) => bookmark.userId === session?.user?.id
    ),
    userReaction:
      post.reactions.find((reaction) => reaction.userId === session?.user?.id)
        ?.reaction ?? null,
  };

  const transformedRelated = await Promise.all(
    relatedPosts.map(async (p) => {
      let ci: string | null = (p as any).coverImageUrl ?? (p as any).coverImage ?? null;
      if (ci && !/^https?:\/\//i.test(ci)) {
        try {
          const { data, error } = await supabase.storage
            .from("documents")
            .createSignedUrl(ci, 60 * 10);
          if (!error) ci = data?.signedUrl ?? ci;
        } catch {}
      }
      const { coverImageUrl: _a, coverImage: _b, ...rest } = p as any;
      return {
        ...rest,
        coverImage: ci ?? null,
        author: {
          name: p.User.name,
          email: p.User.email,
          avatar: p.User.profileImageUrl,
        },
      };
    }),
  );

  return (
    <NewsDetailClient
      post={transformedPost}
      relatedPosts={transformedRelated}
      canEdit={canEdit}
      currentUserId={session?.user?.id}
    />
  );
}
