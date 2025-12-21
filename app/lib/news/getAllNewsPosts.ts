import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

type ReactionCounts = Record<string, number>;

interface GetAllNewsPostsOptions {
  includeDrafts?: boolean; // Include drafts (only for authors/admins)
  includeReadStatus?: boolean; // Include read status for the user
}

export async function getAllNewsPosts(
  companyId: string, 
  userId?: string,
  options: GetAllNewsPostsOptions = {}
) {
  await ensurePrismaConnected();

  if (!companyId) {
    throw new Error("getAllNewsPosts requires companyId");
  }

  const { includeDrafts = false, includeReadStatus = true } = options;

  const signAvatarUrl = async (avatarUrl: string | null | undefined): Promise<string | null> => {
    if (!avatarUrl) return null;

    if (
      /^https?:\/\//i.test(avatarUrl) &&
      avatarUrl.includes("/object/sign/") &&
      avatarUrl.includes("/documents/")
    ) {
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
      return avatarUrl;
    }

    if (!/^https?:\/\//i.test(avatarUrl)) {
      try {
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(avatarUrl, 60 * 10);
        if (!error) return data?.signedUrl ?? avatarUrl;
      } catch {}
    }

    return avatarUrl;
  };

  // Build where clause based on options
  const whereClause: any = {
    OR: [
      { companyId },
      { User: { is: { companyId } } },
    ],
  };

  if (!includeDrafts) {
    // Only published posts
    whereClause.publishedAt = { not: null };
  } else if (userId) {
    // Include drafts only for the author or admins
    // For now, include all drafts for the requesting user's own posts
    whereClause.OR = [
      // Published posts for this company
      {
        publishedAt: { not: null },
        OR: [
          { companyId },
          { User: { is: { companyId } } },
        ],
      },
      // Drafts authored by the current user
      {
        publishedAt: null,
        authorId: userId,
        OR: [
          { companyId },
          { User: { is: { companyId } } },
        ],
      },
    ];
  }

  const posts = await prisma.newsPost.findMany({
    where: whereClause,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true,
          companyId: true,
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
      reads: includeReadStatus && userId ? {
        where: { userId },
        select: { readAt: true },
      } : false,
    },
  });

  return await Promise.all(posts.map(async (post) => {
    const reactionCounts = post.reactions.reduce<ReactionCounts>(
      (acc, reaction) => {
        acc[reaction.reaction] = (acc[reaction.reaction] ?? 0) + 1;
        return acc;
      },
      {}
    );
    // Resolve cover image: prefer URL; if path, sign it
    let cover: string | null = (post as any).coverImageUrl ?? (post as any).coverImage ?? null;
    if (cover) {
      if (/^https?:\/\//i.test(cover) && cover.includes("/object/sign/") && cover.includes("/documents/")) {
        try {
          const after = cover.split("/documents/")[1] || "";
          const path = after.split("?")[0] || "";
          if (path) {
            const { data, error } = await supabase.storage
              .from("documents")
              .createSignedUrl(path, 60 * 10);
            if (!error) cover = data?.signedUrl ?? cover;
          }
        } catch {}
      } else if (!/^https?:\/\//i.test(cover)) {
        try {
          const { data, error } = await supabase.storage
            .from("documents")
            .createSignedUrl(cover, 60 * 10);
          if (!error) cover = data?.signedUrl ?? cover;
        } catch {}
      }
    }

    const signedAvatar = await signAvatarUrl(post.User?.profileImageUrl);

    // Determine read status
    const reads = (post as any).reads;
    const isRead = includeReadStatus && userId && Array.isArray(reads) ? reads.length > 0 : undefined;
    const readAt = includeReadStatus && userId && Array.isArray(reads) && reads.length > 0 
      ? reads[0].readAt 
      : undefined;

    // Determine if this is a draft
    const isDraft = post.publishedAt === null;

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      content: post.content,
      authorId: post.authorId,
      publishedAt: post.publishedAt,
      pinned: post.pinned,
      tags: post.tags,
      audience: post.audience,
      attachments: post.attachments,
      coverImage: cover,
      videoEmbedUrl: post.videoEmbedUrl,
      sendEmail: post.sendEmail,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      views: post.viewCount,
      reactions: reactionCounts,
      bookmarkCount: post.bookmarks.length,
      isBookmarked: post.bookmarks.some((bookmark) => bookmark.userId === userId),
      userReaction:
        post.reactions.find((reaction) => reaction.userId === userId)?.reaction ?? null,
      isRead,
      readAt,
      isDraft,
      User: {
        ...post.User,
        profileImageUrl: signedAvatar,
      },
    };
  }));
}
