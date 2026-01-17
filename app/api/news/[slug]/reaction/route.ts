import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth-options";
import { getMobileSession } from "@/lib/mobile-session";
import { prisma } from "@/lib/prisma";
import { withFeatureGuard } from "@/lib/feature-toggles/api-guard";
import { FEATURE_KEYS } from "@/lib/feature-toggles/types";

interface RouteParams {}

type ReactionCounts = Record<string, number>;

function buildReactionCounts(
  reactions: Array<{ reaction: string; _count: { reaction: number } }>,
): ReactionCounts {
  return reactions.reduce<ReactionCounts>((acc, item) => {
    acc[item.reaction] = item._count.reaction;
    return acc;
  }, {});
}

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
  const mobileSession = await getMobileSession(req);
  const webSession = !mobileSession?.user ? await auth() : null;
  const session = mobileSession?.user ? mobileSession : webSession;

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const reaction = typeof body?.reaction === "string" ? body.reaction : null;

  if (!reaction) {
    return NextResponse.json({ error: "Reaction is required" }, { status: 400 });
  }

  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;
  const post = await getPostForCompany(slug, session.user.companyId);

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await prisma.newsReaction.upsert({
    where: {
      postId_userId: {
        postId: post.id,
        userId: session.user.id,
      },
    },
    create: {
      postId: post.id,
      userId: session.user.id,
      companyId: session.user.companyId,
      reaction,
    },
    update: { reaction },
  });

  const aggregated = await prisma.newsReaction.groupBy({
    by: ["reaction"],
    where: { postId: post.id },
    _count: { reaction: true },
  });

  return NextResponse.json({
    reactions: buildReactionCounts(aggregated),
    userReaction: reaction,
  });
}

async function deleteHandler(req: NextRequest, context: any) {
  const mobileSession = await getMobileSession(req);
  const webSession = !mobileSession?.user ? await auth() : null;
  const session = mobileSession?.user ? mobileSession : webSession;

  if (!session?.user?.id || !session.user.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawParams = context?.params;
  const { slug } = rawParams?.then ? await rawParams : rawParams;
  const post = await getPostForCompany(slug, session.user.companyId);

  if (!post) {
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  await prisma.newsReaction.deleteMany({
    where: {
      postId: post.id,
      userId: session.user.id,
    },
  });

  const aggregated = await prisma.newsReaction.groupBy({
    by: ["reaction"],
    where: { postId: post.id },
    _count: { reaction: true },
  });

  return NextResponse.json({
    reactions: buildReactionCounts(aggregated),
    userReaction: null,
  });
}

// Apply feature guard
const newsGuard = withFeatureGuard(FEATURE_KEYS.NEWS);
export const POST = newsGuard(postHandler);
export const DELETE = newsGuard(deleteHandler);

