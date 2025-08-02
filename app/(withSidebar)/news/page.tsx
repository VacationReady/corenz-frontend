import { getAllNewsPosts } from '@/lib/news/getAllNewsPosts';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import NewsPageClient from '@/components/news/NewsPageClient';

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

  // Render the refactored client-side NewsPage with server-fetched props
  return <NewsPageClient posts={posts} canPost={canPost} />;
}
