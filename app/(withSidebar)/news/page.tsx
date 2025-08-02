import { getAllNewsPosts } from '@/lib/news/getAllNewsPosts';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import NewsPageClient, { NewsPageClientProps } from '@/components/news/NewsPageClient';

export default async function NewsPage() {
  // Fetch all posts server-side
  const posts = await getAllNewsPosts();

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

  // ✅ Transform posts to match NewsPageClient expected type
  const transformedPosts: NewsPageClientProps['posts'] = posts.map(post => ({
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    authorId: post.authorId,
    author: {
      firstName: post.author?.name?.split(' ')[0] || '',
      lastName: post.author?.name?.split(' ')[1] || '',
    },
    publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
    pinned: post.pinned,
    tags: post.tags || [],
    createdAt: post.createdAt.toISOString(),
  }));

  return <NewsPageClient posts={transformedPosts} canPost={canPost} />;
}
