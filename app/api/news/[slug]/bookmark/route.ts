import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

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

async function postHandler(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;
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

// Apply feature guard
export const POST = withFeatureGuard(FEATURE_KEYS.NEWS)(postHandler);

