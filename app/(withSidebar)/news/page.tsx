import { getAllNewsPosts } from "@/lib/news/getAllNewsPosts";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma, ensurePrismaConnected } from "@/lib/prisma";
import NewsPageClient from "@/components/news/NewsPageClient"; // ✅ Missing import added

export const dynamic = "force-dynamic";

export default async function NewsPage() {
  // Fetch all posts server-side, scoped to company
  const session = await getServerSession(authOptions);
  await ensurePrismaConnected();
  const posts = await getAllNewsPosts(session?.user?.companyId);

  // ✅ Transform posts minimally to ensure correct types
  const transformedPosts = posts.map((post: any) => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    authorId: post.authorId,
    author: {
      name: post.User?.name ?? null,
      email: post.User?.email ?? "",
      avatar: post.User?.profileImageUrl ?? undefined,
    },
    publishedAt: post.publishedAt
      ? new Date(post.publishedAt).toISOString()
      : null,
    pinned: post.pinned,
    tags: post.tags,
    createdAt: new Date(post.createdAt).toISOString(),
  }));

  // Determine permissions
  let canPost = false;

  if (session?.user?.email && session?.user?.companyId) {
    const dbUser = await prisma.user.findUnique({
      where: {
        email_companyId: {
          email: session.user.email,
          companyId: session.user.companyId,
        },
      },
    });

    if (dbUser?.role === "ADMIN" || dbUser?.role === "MANAGER") {
      canPost = true;
    }
  }

  // Render the refactored client-side NewsPage with server-fetched props
  return <NewsPageClient posts={transformedPosts} canPost={canPost} />;
}
