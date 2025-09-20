import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import NewsDetailClient from "@/components/news/NewsDetailClient";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export default async function NewsDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  const post = await prisma.newsPost.findFirst({
    where: {
      slug: params.slug,
      ...(session?.user?.companyId
        ? { User: { companyId: session.user.companyId } }
        : {}),
    },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true,
          role: true,
        },
      },
    },
  });

  if (!post) return notFound();

  // Fetch related posts
  const relatedPosts = await prisma.newsPost.findMany({
    where: {
      id: { not: post.id },
      ...(session?.user?.companyId
        ? { User: { companyId: session.user.companyId } }
        : {}),
      OR: [
        { tags: { hasSome: post.tags } },
        { authorId: post.authorId },
      ],
    },
    take: 3,
    include: {
      User: {
        select: {
          name: true,
          email: true,
          profileImageUrl: true,
        },
      },
    },
    orderBy: { publishedAt: "desc" },
  });

  const isAuthor = session?.user?.id === post.authorId;
  const isAdmin = session?.user?.role === "ADMIN";
  const canEdit = isAuthor || isAdmin;

  // Transform the post data to match client expectations
  const { coverImageUrl: coverImageFromPost, ...postRest } = post;
  const transformedPost = {
    ...postRest,
    coverImage: coverImageFromPost ?? null,
    author: {
      id: post.User.id,
      name: post.User.name,
      email: post.User.email,
      avatar: post.User.profileImageUrl,
      role: post.User.role,
    },
    content: post.content as any,
    attachments: post.attachments as string[],
    audience: post.audience as any,
    readTime: Math.ceil(
      JSON.stringify(post.content).split(" ").length / 200
    ), // Estimate read time
    reactions: {
      likes: 0,
      hearts: 0,
      fire: 0,
    }, // TODO: Implement reactions in database
    views: 0, // TODO: Implement view tracking
  };

  const transformedRelated = relatedPosts.map((p) => {
    const { coverImageUrl, ...rest } = p;
    return {
      ...rest,
      coverImage: coverImageUrl ?? null,
      author: {
        name: p.User.name,
        email: p.User.email,
        avatar: p.User.profileImageUrl,
      },
    };
  });

  return (
    <NewsDetailClient
      post={transformedPost}
      relatedPosts={transformedRelated}
      canEdit={canEdit}
      currentUserId={session?.user?.id}
    />
  );
}