export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth-options";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

async function postHandler(req: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawParams = context?.params;
    const { slug } = rawParams?.then ? await rawParams : rawParams;
    const userId = session.user.id;
    const companyId = session.user.companyId;

    // Find the news post
    const newsPost = await prisma.newsPost.findFirst({
      where: {
        slug,
        OR: [
          { companyId },
          { User: { is: { companyId } } },
        ],
      },
      select: { id: true },
    });

    if (!newsPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Upsert the read record
    const newsRead = await (prisma as any).newsRead.upsert({
      where: {
        postId_userId: {
          postId: newsPost.id,
          userId,
        },
      },
      update: {
        readAt: new Date(),
      },
      create: {
        companyId,
        postId: newsPost.id,
        userId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      isRead: true,
      readAt: newsRead.readAt,
    });
  } catch (error) {
    console.error("Error marking news as read:", error);
    return NextResponse.json(
      { error: "Failed to mark as read" },
      { status: 500 }
    );
  }
}

async function deleteHandler(req: NextRequest, context: any) {
  try {
    const session = await auth();
    if (!session?.user?.id || !session.user.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rawParams = context?.params;
    const { slug } = rawParams?.then ? await rawParams : rawParams;
    const userId = session.user.id;
    const companyId = session.user.companyId;

    // Find the news post
    const newsPost = await prisma.newsPost.findFirst({
      where: {
        slug,
        OR: [
          { companyId },
          { User: { is: { companyId } } },
        ],
      },
      select: { id: true },
    });

    if (!newsPost) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Delete the read record if it exists
    await (prisma as any).newsRead.deleteMany({
      where: {
        postId: newsPost.id,
        userId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      isRead: false,
    });
  } catch (error) {
    console.error("Error unmarking news as read:", error);
    return NextResponse.json(
      { error: "Failed to unmark as read" },
      { status: 500 }
    );
  }
}

// Apply feature guard
const newsGuard = withFeatureGuard(FEATURE_KEYS.NEWS);
export const POST = newsGuard(postHandler);
export const DELETE = newsGuard(deleteHandler);
