import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";

type ReactionCounts = Record<string, number>;

export async function getAllNewsPosts(companyId: string, userId?: string) {
  await ensurePrismaConnected();

  if (!companyId) {
    throw new Error("getAllNewsPosts requires companyId");
  }

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

  const posts = await prisma.newsPost.findMany({
    where: {
      publishedAt: { not: null },
      OR: [
        { companyId },
        { User: { is: { companyId } } },
      ],
    },
    orderBy: { publishedAt: "desc" },
    include: {
      User: {
        select: {
          name: true,
          email: true,
          profileImageUrl: true,
          companyId: true,
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
      User: {
        ...post.User,
        profileImageUrl: signedAvatar,
      },
    };
  }));
}
