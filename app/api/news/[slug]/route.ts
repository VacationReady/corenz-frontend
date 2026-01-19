import { auth } from "@/lib/auth-options";
import { getMobileSession } from "@/lib/mobile-session";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendNewsEmail } from "@/lib/news/sendNewsEmail";
import { isEmailRateLimited, getEmailRateLimitError } from "@/lib/email-rate-limit";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";
import supabase from "@/lib/supabase-admin";

interface Params {}

// GET: Fetch a single news post with related posts and engagement data
async function getHandler(req: NextRequest, context: any) {
  // Support both mobile and web sessions
  const mobileSession = await getMobileSession(req);
  const webSession = !mobileSession?.user ? await auth() : null;
  const session = mobileSession?.user ? mobileSession : webSession;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;
  
  const post = await prisma.newsPost.findFirst({
    where: { 
      slug: slug, 
      companyId: session.user.companyId,
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

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Fetch related posts
  const relatedPosts = await prisma.newsPost.findMany({
    where: {
      id: { not: post.id },
      companyId: session.user.companyId,
      publishedAt: { not: null },
      OR: [
        { tags: { hasSome: post.tags } },
        { authorId: post.authorId },
      ],
    },
    take: 3,
    select: {
      id: true,
      title: true,
      slug: true,
      coverImageUrl: true,
      publishedAt: true,
      tags: true,
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

  // Calculate reaction counts
  const reactionCounts = (post.reactions as { reaction: string; userId: string }[]).reduce(
    (acc: Record<string, number>, reaction: { reaction: string; userId: string }) => {
      acc[reaction.reaction] = (acc[reaction.reaction] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  // Format author name
  const formatFullName = (user: { firstName?: string | null; lastName?: string | null; name?: string | null; email: string }) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) return user.firstName;
    if (user.lastName) return user.lastName;
    if (user.name) return user.name;
    return user.email.split("@")[0];
  };

  const transformedPost = {
    ...(await mapNewsPost(post)),
    author: {
      id: post.User.id,
      name: formatFullName(post.User),
      email: post.User.email,
      avatar: post.User.profileImageUrl,
      role: post.User.role,
    },
    content: post.content,
    attachments: post.attachments as string[],
    audience: post.audience,
    readTime: Math.ceil(JSON.stringify(post.content).split(" ").length / 200),
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
    const mappedPost = await mapNewsPost(p);
    const { User, ...rest } = mappedPost;
    return {
      ...rest,
      author: {
        name: formatFullName(p.User),
        email: p.User.email,
        avatar: p.User.profileImageUrl,
      },
    };
  })
);

  return NextResponse.json({
    post: transformedPost,
    relatedPosts: transformedRelated,
  });
}

// PUT: Update a news post
async function putHandler(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;

  const companyId = session.user.companyId;

  if (!companyId) {
    return NextResponse.json({ error: "Company context missing" }, { status: 400 });
  }

  const existing = await prisma.newsPost.findFirst({
    where: { slug, companyId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const postCompanyId = existing.companyId;

  if (!postCompanyId) {
    return NextResponse.json(
      { error: "Post company missing" },
      { status: 500 }
    );
  }

  const isAuthor = existing.authorId === session.user.id;
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const updated = await prisma.newsPost.update({
    where: { id: existing.id },
    data: {
      title: body.title,
      content: body.content,
      coverImageUrl: body.coverImage ?? null,
      videoEmbedUrl: body.videoEmbedUrl,
      attachments: Array.isArray(body.attachments)
        ? body.attachments.map((att: any) => 
            typeof att === 'string' ? att : att.url || att.path || ''
          ).filter(Boolean)
        : [],
      sendEmail: body.sendEmail,
      audience: body.audience || { type: "all" },
      updatedAt: new Date(),
    },
  });

  // Only admins can send emails - enforce admin-only email sending
  if (body.sendEmail) {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Only admins can send news emails" },
        { status: 403 },
      );
    }

    // Check email rate limit before sending
    const rateLimited = await isEmailRateLimited(session.user.id);
    if (rateLimited) {
      return NextResponse.json(getEmailRateLimitError(), { status: 429 });
    }
    
    const recipients = await prisma.user.findMany({
      where: {
        companyId: postCompanyId,
        email: { not: "" },
      },
      select: { email: true },
    });

    await sendNewsEmail({
      title: updated.title,
      slug: updated.slug,
      recipients: recipients.map((u: { email: string }) => u.email) || [],
    });
  }

  return NextResponse.json(await mapNewsPost(updated));
}

// DELETE: Delete a news post
async function deleteHandler(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;

  const companyId = session.user.companyId;

  if (!companyId) {
    return NextResponse.json({ error: "Company context missing" }, { status: 400 });
  }

  const existing = await prisma.newsPost.findFirst({
    where: { slug, companyId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const isAuthor = existing.authorId === session.user.id;
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.newsPost.delete({
    where: { id: existing.id },
  });

  return new Response(null, { status: 204 });
}

type NewsPostRecord = {
  coverImageUrl: string | null;
} & Record<string, any>;

async function mapNewsPost<T extends NewsPostRecord>(post: T): Promise<Omit<T, "coverImageUrl"> & { coverImage: string | null }> {
  const { coverImageUrl, ...rest } = post;
  let coverUrl: string | null = coverImageUrl ?? null;
  
  if (coverUrl) {
    // If already a signed Supabase URL and likely expired, extract path and re-sign
    if (/^https?:\/\//i.test(coverUrl) && coverUrl.includes("/object/sign/") && coverUrl.includes("/documents/")) {
      try {
        const after = coverUrl.split("/documents/")[1] || "";
        const path = after.split("?")[0] || "";
        if (path) {
          const { data, error } = await supabase.storage
            .from("documents")
            .createSignedUrl(path, 60 * 10);
          if (!error) coverUrl = data?.signedUrl ?? coverUrl;
        }
      } catch {}
    } else if (!/^https?:\/\//i.test(coverUrl)) {
      // Stored as a bare path; sign it
      try {
        const { data, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(coverUrl, 60 * 10);
        if (!error) coverUrl = data?.signedUrl ?? null;
      } catch {}
    }
  }

  return {
    ...rest,
    coverImage: coverUrl,
  } as Omit<T, "coverImageUrl"> & { coverImage: string | null };
}

// Apply feature guard to all handlers
const newsGuard = withFeatureGuard(FEATURE_KEYS.NEWS);
export const GET = newsGuard(getHandler);
export const PUT = newsGuard(putHandler);
export const DELETE = newsGuard(deleteHandler);
