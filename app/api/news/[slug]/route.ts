import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendNewsEmail } from "@/lib/news/sendNewsEmail";

interface Params {
  params: { slug: string };
}

// ✅ GET: Fetch a single news post
export async function GET(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const post = await prisma.newsPost.findFirst({
    where: { slug: params.slug, companyId: session.user.companyId },
    include: { User: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const isAuthor = post.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(mapNewsPost(post));
}

// ✅ PUT: Update a news post
export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = params;

  const existing = await prisma.newsPost.findUnique({
    where: { slug },
  });

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const isAuthor = existing.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();

  const updated = await prisma.newsPost.update({
    where: { slug },
    data: {
      title: body.title,
      content: body.content,
      coverImageUrl: body.coverImage ?? null,
      videoEmbedUrl: body.videoEmbedUrl,
      attachments: body.attachments,
      sendEmail: body.sendEmail,
      audience: body.audience || { type: "all" },
      updatedAt: new Date(),
    },
  });

  if (body.sendEmail) {
    const recipients = await prisma.user.findMany({
      where: { email: { not: "" } },
      select: { email: true },
    });

    await sendNewsEmail({
      title: updated.title,
      slug: updated.slug,
      recipients: recipients.map((u) => u.email!) || [],
    });
  }

  return NextResponse.json(mapNewsPost(updated));
}

// ✅ DELETE: Delete a news post
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = params;

  const existing = await prisma.newsPost.findUnique({
    where: { slug },
  });

  if (!existing) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const isAuthor = existing.authorId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isAuthor && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.newsPost.delete({
    where: { slug },
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
