import { prisma, ensurePrismaConnected } from "@/lib/prisma";

type ReactionCounts = Record<string, number>;

export async function getAllNewsPosts(companyId?: string, userId?: string) {
  await ensurePrismaConnected();
  const posts = await prisma.newsPost.findMany({
    where: {
      publishedAt: { not: null },
      ...(companyId ? { User: { companyId } } : {}),
    },
    orderBy: { publishedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      coverImage: true,
      authorId: true,
      publishedAt: true,
      pinned: true,
      tags: true,
      audience: true,
      attachments: true,
      videoEmbedUrl: true,
      sendEmail: true,
      createdAt: true,
      updatedAt: true,
      viewCount: true,
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

  return posts.map((post) => {
    const reactionCounts = post.reactions.reduce<ReactionCounts>((acc, reaction) => {
      acc[reaction.reaction] = (acc[reaction.reaction] ?? 0) + 1;
      return acc;
    }, {});

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
      coverImage: post.coverImage,
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
      User: post.User,
    };
  });
}
