import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

interface RouteParams {}

export async function POST(req: NextRequest, context: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = context.params;
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

  const updated = await prisma.newsPost.update({
    where: { id: post.id },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  });

  return NextResponse.json({ viewCount: updated.viewCount });
}

