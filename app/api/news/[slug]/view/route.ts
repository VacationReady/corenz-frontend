import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

interface RouteParams {}

async function postHandler(req: NextRequest, context: any) {
  const session = await auth();

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;
  const post = await prisma.newsPost.findFirst({
    where: {
      slug: slug,
      OR: [
        { companyId: session.user.companyId },
        { User: { companyId: session.user.companyId } },
      ],
    },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  // Only increment view count if this is the user's first view
  let shouldIncrementView = false;
  let existingRead = null;

  if (session?.user?.id) {
    try {
      existingRead = await (prisma as any).newsRead.findUnique({
        where: {
          postId_userId: {
            postId: post.id,
            userId: session.user.id,
          },
        },
      });

      // Only increment if user hasn't viewed this post before
      shouldIncrementView = !existingRead;

      // Mark as read for the current user
      await (prisma as any).newsRead.upsert({
        where: {
          postId_userId: {
            postId: post.id,
            userId: session.user.id,
          },
        },
        update: {
          readAt: new Date(),
        },
        create: {
          companyId: session.user.companyId,
          postId: post.id,
          userId: session.user.id,
        },
      });
    } catch (error) {
      // Log but don't fail the request if read tracking fails
      console.error("Failed to mark news as read:", error);
      // If read tracking fails, increment view as fallback
      shouldIncrementView = true;
    }
  } else {
    // Anonymous or unauthenticated users always increment
    shouldIncrementView = true;
  }

  // Update view count only if needed
  const updated = await prisma.newsPost.update({
    where: { id: post.id },
    data: shouldIncrementView ? { viewCount: { increment: 1 } } : {},
    select: { viewCount: true },
  });

  return NextResponse.json({ viewCount: updated.viewCount, isRead: true });
}

// Apply feature guard
export const POST = withFeatureGuard(FEATURE_KEYS.NEWS)(postHandler);

