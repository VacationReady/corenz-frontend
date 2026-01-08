import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendNewsEmail } from "@/lib/news/sendNewsEmail";
import { isEmailRateLimited, getEmailRateLimitError } from "@/lib/email-rate-limit";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

interface Params {}

// GET: Fetch a single news post
async function getHandler(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;
  const post = await prisma.newsPost.findFirst({
    where: { slug: slug, companyId: session.user.companyId },
    include: { User: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const isAuthor = post.authorId === session.user.id;
  const isAdmin =
    session.user.role === "ADMIN" || session.user.role === "SUPER_ADMIN";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(mapNewsPost(post));
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

  return NextResponse.json(mapNewsPost(updated));
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

function mapNewsPost<T extends NewsPostRecord>(post: T) {
  const { coverImageUrl, ...rest } = post;
  return {
    ...rest,
    coverImage: coverImageUrl ?? null,
  } as Omit<T, "coverImageUrl"> & { coverImage: string | null };
}

// Apply feature guard to all handlers
const newsGuard = withFeatureGuard(FEATURE_KEYS.NEWS);
export const GET = newsGuard(getHandler);
export const PUT = newsGuard(putHandler);
export const DELETE = newsGuard(deleteHandler);
