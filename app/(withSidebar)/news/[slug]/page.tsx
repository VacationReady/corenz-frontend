import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import NewsDetailClient from "@/components/news/NewsDetailClient";
import supabase from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function NewsDetailPage(context: any) {
  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;
  const session = await auth();

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
          firstName: true,
          lastName: true,
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
          firstName: true,
          lastName: true,
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

  // Helper to format full name
  const formatFullName = (user: { firstName?: string | null; lastName?: string | null; name?: string | null; email: string }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    if (user.name) return user.name;
    return user.email.split("@")[0];
  };

  // Helper to sign avatar URL
  const signAvatarUrl = async (avatarUrl: string | null | undefined): Promise<string | null> => {
    if (!avatarUrl) return null;
    if (/^https?:\/\//i.test(avatarUrl) && avatarUrl.includes("/object/sign/") && avatarUrl.includes("/documents/")) {
      try {
        const after = avatarUrl.split("/documents/")[1] || "";
        const path = after.split("?")[0] || "";
        if (path) {
          const { data, error } = await supabase.storage
            .from("documents")
            .createSignedUrl(path, 60 * 10);
          if (!error) return data?.signedUrl ?? avatarUrl;
        }
      } catch {}
    } else if (!/^https?:\/\//i.test(avatarUrl)) {
      try {
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(avatarUrl, 60 * 10);
        if (!error) return data?.signedUrl ?? avatarUrl;
      } catch {}
    }
    return avatarUrl;
  };

  // Sign the main post author's avatar
  const signedAuthorAvatar = await signAvatarUrl(post.User.profileImageUrl);

  const reactionCounts = (post.reactions as { reaction: string; userId: string }[]).reduce(
    (acc: Record<string, number>, reaction: { reaction: string; userId: string }) => {
      acc[reaction.reaction] = (acc[reaction.reaction] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const transformedPost = {
    ...postRest,
    coverImage: coverImageFromPost ?? null,
    author: {
      id: post.User.id,
      name: formatFullName(post.User),
      email: post.User.email,
      avatar: signedAuthorAvatar,
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
      (bookmark: { userId: string }) => bookmark.userId === session?.user?.id
    ),
    userReaction:
      post.reactions.find(
        (reaction: { userId: string }) => reaction.userId === session?.user?.id
      )?.reaction ?? null,
  };

  const transformedRelated = await Promise.all(
    relatedPosts.map(async (p: any) => {
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
      const signedRelatedAvatar = await signAvatarUrl(p.User.profileImageUrl);
      return {
        ...rest,
        coverImage: ci ?? null,
        author: {
          name: formatFullName(p.User),
          email: p.User.email,
          avatar: signedRelatedAvatar,
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
