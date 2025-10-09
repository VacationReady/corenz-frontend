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

/**
 * Record a share action for analytics
 * POST /api/news/[slug]/share
 */
export async function POST(req: NextRequest, context: any) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;
  const post = await getPostForCompany(slug, session.user.companyId);

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  try {
    // Record the share in the database (you can create a NewsShare model if needed)
    // For now, we'll just increment a counter in the post metadata
    await prisma.newsPost.update({
      where: { id: post.id },
      data: {
        metadata: {
          ...(await prisma.newsPost.findUnique({
            where: { id: post.id },
            select: { metadata: true },
          }))?.metadata as any,
          shareCount: ((await prisma.newsPost.findUnique({
            where: { id: post.id },
            select: { metadata: true },
          }))?.metadata as any)?.shareCount ? 
            (((await prisma.newsPost.findUnique({
              where: { id: post.id },
              select: { metadata: true },
            }))?.metadata as any)?.shareCount as number) + 1 : 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Share recorded",
    });
  } catch (error) {
    console.error("Failed to record share:", error);
    return NextResponse.json(
      { error: "Failed to record share" },
      { status: 500 }
    );
  }
}
