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

/**
 * Record a share action for analytics
 * POST /api/news/[slug]/share
 */
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

  try {
    // Increment the share counter
    await prisma.newsPost.update({
      where: { id: post.id },
      data: {
        shareCount: {
          increment: 1,
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

// Apply feature guard
export const POST = withFeatureGuard(FEATURE_KEYS.NEWS)(postHandler);
