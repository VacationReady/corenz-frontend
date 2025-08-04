import { getAllNewsPosts } from '@/lib/news/getAllNewsPosts';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';

export default async function NewsPage() {
  // Fetch all posts server-side
  const posts = await getAllNewsPosts();

  // ✅ Transform posts minimally to ensure correct types
const transformedPosts = posts.map(post => ({    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    authorId: post.authorId,
    author: {
      name: post.author.name,
      email: post.author.email,
    },
    publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString() : null,
    pinned: post.pinned,
    tags: post.tags,
    createdAt: new Date(post.createdAt).toISOString(),
  }));

  // Fetch session and determine permissions
  const session = await getServerSession(authOptions);
  let canPost = false;

  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (dbUser?.role === 'ADMIN' || dbUser?.role === 'MANAGER') {
      canPost = true;
    }
  }

  // Render the refactored client-side NewsPage with server-fetched props
  return <NewsPageClient posts={transformedPosts} canPost={canPost} />;
}
