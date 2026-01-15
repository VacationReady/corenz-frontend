import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import supabase from "@/lib/supabase-admin";
import { Prisma } from "@prisma/client";

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

  // Fetch requesting user's profile for audience filtering
  let requestingUser: any = null;
  let isAdmin = false;
  let departmentName: string | null = null;
  let jobRoleName: string | null = null;
  let locationName: string | null = null;

  if (userId) {
    requestingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        Department_User_departmentIdToDepartment: {
          select: { name: true },
        },
        JobRole: {
          select: { name: true },
        },
        Employee: {
          select: {
            Location: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (requestingUser) {
      isAdmin = requestingUser.role === "ADMIN" || requestingUser.role === "SUPER_ADMIN";
      departmentName = requestingUser.Department_User_departmentIdToDepartment?.name ?? null;
      jobRoleName = requestingUser.JobRole?.name ?? null;
      locationName = requestingUser.Employee?.Location?.name ?? null;
    }
  }

  // Build audience filter - user should see post if they match ANY specified dimension
  const audienceWhereClause = isAdmin || !userId ? {} : {
    OR: [
      // Show if post targets all users (type is "all" or null/undefined with no specific targeting)
      { audience: { path: ["type"], equals: "all" } },
      {
        AND: [
          {
            OR: [
              { audience: { path: ["type"], equals: Prisma.AnyNull } },
              { audience: { path: ["type"], equals: Prisma.DbNull } },
            ],
          },
          {
            OR: [
              { audience: { path: ["departments"], equals: Prisma.AnyNull } },
              { audience: { path: ["departments"], equals: [] } },
            ],
          },
          {
            OR: [
              { audience: { path: ["roles"], equals: Prisma.AnyNull } },
              { audience: { path: ["roles"], equals: [] } },
            ],
          },
          {
            OR: [
              { audience: { path: ["locations"], equals: Prisma.AnyNull } },
              { audience: { path: ["locations"], equals: [] } },
            ],
          },
        ],
      },
      // Show if user's department matches (and departments are specified)
      ...(departmentName ? [{
        AND: [
          { audience: { path: ["departments"], not: Prisma.AnyNull } },
          { audience: { path: ["departments"], not: { equals: [] } } },
          { audience: { path: ["departments"], array_contains: [departmentName] } },
        ],
      }] : []),
      // Show if user's role matches (and roles are specified)
      ...(jobRoleName ? [{
        AND: [
          { audience: { path: ["roles"], not: Prisma.AnyNull } },
          { audience: { path: ["roles"], not: { equals: [] } } },
          { audience: { path: ["roles"], array_contains: [jobRoleName] } },
        ],
      }] : []),
      // Show if user's location matches (and locations are specified)
      ...(locationName ? [{
        AND: [
          { audience: { path: ["locations"], not: Prisma.AnyNull } },
          { audience: { path: ["locations"], not: { equals: [] } } },
          { audience: { path: ["locations"], array_contains: [locationName] } },
        ],
      }] : []),
    ],
  };

  // Build where clause based on options
  const baseWhereClause = {
    OR: [
      { companyId },
      { User: { is: { companyId } } },
    ],
  };

  let whereClause: any;

  if (!includeDrafts) {
    // Only published posts with audience filtering
    whereClause = {
      AND: [
        baseWhereClause,
        { publishedAt: { not: null } },
        audienceWhereClause,
      ],
    };
  } else if (userId) {
    // Include drafts only for the author, plus published posts with audience filtering
    whereClause = {
      OR: [
        // Published posts for this company with audience filtering
        {
          AND: [
            { publishedAt: { not: null } },
            baseWhereClause,
            audienceWhereClause,
          ],
        },
        // Drafts authored by the current user (no audience filter for own drafts)
        {
          publishedAt: null,
          authorId: userId,
          OR: [
            { companyId },
            { User: { is: { companyId } } },
          ],
        },
      ],
    };
  } else {
    // No user ID provided, just use base clause with audience filtering
    whereClause = {
      AND: [
        baseWhereClause,
        audienceWhereClause,
      ],
    };
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
