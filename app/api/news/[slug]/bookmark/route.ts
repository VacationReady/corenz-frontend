import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

interface RouteParams {}

async function getPostForCompany(slug: string, companyId: string) {
  return prisma.newsPost.findFirst({
    where: {
      slug,
      OR: [
        { companyId },
        { User: { companyId } },
      ],
    },
    select: { id: true },
  });
}

export async function POST(req: NextRequest, context: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = context.params;
  const post = await getPostForCompany(slug, session.user.companyId);

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const existing = await prisma.newsBookmark.findUnique({
    where: {
      postId_userId: {
        postId: post.id,
        userId: session.user.id,
      },
    },
  });

  if (existing) {
    await prisma.newsBookmark.delete({
      where: {
        postId_userId: {
          postId: post.id,
          userId: session.user.id,
        },
      },
    });
  } else {
    await prisma.newsBookmark.create({
      data: {
        postId: post.id,
        userId: session.user.id,
        companyId: session.user.companyId,
      },
    });
  }

  const bookmarkCount = await prisma.newsBookmark.count({
    where: { postId: post.id },
  });

  return NextResponse.json({
    isBookmarked: !existing,
    bookmarkCount,
  });
}

