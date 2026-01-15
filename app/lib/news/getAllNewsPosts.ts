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
        departmentId: true,
        jobRoleId: true,
        Department_User_departmentIdToDepartment: {
          select: { name: true },
        },
        JobRole: {
          select: { name: true },
        },
        Employee: {
          select: {
            departmentId: true,
            jobRoleId: true,
            Department: {
              select: { name: true },
            },
            JobRole: {
              select: { name: true },
            },
            Location: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (requestingUser) {
      isAdmin = requestingUser.role === "ADMIN" || requestingUser.role === "SUPER_ADMIN";
      
      // Check User table first, then fall back to Employee table for department/role
      departmentName = 
        requestingUser.Department_User_departmentIdToDepartment?.name ?? 
        requestingUser.Employee?.Department?.name ?? 
        null;
      
      jobRoleName = 
        requestingUser.JobRole?.name ?? 
        requestingUser.Employee?.JobRole?.name ?? 
        null;
      
      locationName = requestingUser.Employee?.Location?.name ?? null;
    }
  }

  // Helper: check if a dimension filter is empty/null
  const dimensionIsEmpty = (path: string) => ({
    OR: [
      { audience: { path: [path], equals: Prisma.AnyNull } },
      { audience: { path: [path], equals: Prisma.DbNull } },
      { audience: { path: [path], equals: [] } },
    ],
  });

  // Helper: check if user matches a dimension
  const userMatchesDimension = (path: string, value: string | null) => {
    if (!value) return null;
    return {
      audience: { path: [path], array_contains: [value] },
    };
  };

  // Helper: check if dimension is populated AND user matches it
  const dimensionPopulatedAndMatches = (path: string, value: string | null) => {
    if (!value) return null;
    return {
      AND: [
        { audience: { path: [path], not: Prisma.AnyNull } },
        { audience: { path: [path], not: { equals: [] } } },
        { audience: { path: [path], array_contains: [value] } },
      ],
    };
  };

  // Helper: check if dimension is populated AND user does NOT match it
  const dimensionPopulatedAndNoMatch = (path: string, value: string | null) => {
    // If user has no value for this dimension, they fail the check
    if (!value) {
      return {
        AND: [
          { audience: { path: [path], not: Prisma.AnyNull } },
          { audience: { path: [path], not: { equals: [] } } },
        ],
      };
    }
    return {
      AND: [
        { audience: { path: [path], not: Prisma.AnyNull } },
        { audience: { path: [path], not: { equals: [] } } },
        { NOT: { audience: { path: [path], array_contains: [value] } } },
      ],
    };
  };

  /**
   * Audience Matching Logic:
   * 
   * ALL mode (default): User must match ALL populated filter dimensions.
   *   - If departments is populated, user must be in one of those departments
   *   - If roles is populated, user must have one of those roles  
   *   - If locations is populated, user must be in one of those locations
   *   - Empty dimensions don't disqualify the user
   * 
   * ANY mode: User must match AT LEAST ONE populated filter dimension.
   *   - User matches if their department, role, OR location matches any filter
   *   - Empty dimensions don't count as a match
   */
  const buildAudienceFilter = () => {
    if (isAdmin || !userId) return {};

    // Condition: post targets all users
    const targetsAll = { audience: { path: ["type"], equals: "all" } };

    // Condition: no specific targeting (type is null AND all dimensions empty)
    const noTargeting = {
      AND: [
        {
          OR: [
            { audience: { path: ["type"], equals: Prisma.AnyNull } },
            { audience: { path: ["type"], equals: Prisma.DbNull } },
          ],
        },
        dimensionIsEmpty("departments"),
        dimensionIsEmpty("roles"),
        dimensionIsEmpty("locations"),
      ],
    };

    // ALL mode filter: user must match every populated dimension
    // For each dimension: either it's empty OR user matches it
    const allModeFilter = {
      AND: [
        { audienceMatchMode: "ALL" },
        // Department: empty OR user matches
        {
          OR: [
            dimensionIsEmpty("departments"),
            ...(departmentName ? [userMatchesDimension("departments", departmentName)] : []),
          ].filter(Boolean),
        },
        // Role: empty OR user matches
        {
          OR: [
            dimensionIsEmpty("roles"),
            ...(jobRoleName ? [userMatchesDimension("roles", jobRoleName)] : []),
          ].filter(Boolean),
        },
        // Location: empty OR user matches
        {
          OR: [
            dimensionIsEmpty("locations"),
            ...(locationName ? [userMatchesDimension("locations", locationName)] : []),
          ].filter(Boolean),
        },
      ],
    };

    // ANY mode filter: user must match at least one populated dimension
    const anyModeMatches = [
      dimensionPopulatedAndMatches("departments", departmentName),
      dimensionPopulatedAndMatches("roles", jobRoleName),
      dimensionPopulatedAndMatches("locations", locationName),
    ].filter(Boolean);

    const anyModeFilter = anyModeMatches.length > 0 ? {
      AND: [
        { audienceMatchMode: "ANY" },
        { OR: anyModeMatches },
      ],
    } : null;

    return {
      OR: [
        targetsAll,
        noTargeting,
        allModeFilter,
        ...(anyModeFilter ? [anyModeFilter] : []),
      ],
    };
  };

  const audienceWhereClause = buildAudienceFilter();

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
