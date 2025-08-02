import { getAllNewsPosts } from '@/lib/news/getAllNewsPosts';
import Link from 'next/link';
import { format } from 'date-fns';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import Button from '@/components/ui/Button';

export default async function NewsPage() {
  const posts = await getAllNewsPosts();
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

  return (
    <div className="min-h-screen bg-content-panel">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-content-panel border-b border-enhanced backdrop-blur-sm">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Company News</h1>
              <p className="text-muted-foreground text-base">
                Stay updated with the latest company announcements
              </p>
            </div>
            {canPost && (
              <Link href="/news/create">
                <Button variant="primary">Create News</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-8 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {posts.map((post) => (
            <Link key={post.id} href={`/news/${post.slug}`}>
              <div className="bg-card rounded-xl shadow-lg border border-enhanced p-6 hover:shadow-enterprise transition-smooth hover-lift">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-foreground hover:text-primary transition-smooth">
                    {post.title}
                  </h2>
                  {post.publishedAt && (
                    <span className="text-sm text-muted-foreground bg-section-background px-3 py-1 rounded-full">
                      {format(new Date(post.publishedAt), 'dd MMM yyyy')}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  By {post.author?.name ?? 'Unknown'}
                </p>
                <p className="text-foreground leading-relaxed line-clamp-3">
                  {typeof post.content === 'string'
                    ? post.content.slice(0, 200) + '...'
                    : '[Rich content]'}
                </p>
                <div className="mt-4 pt-4 border-t border-enhanced">
                  <span className="text-sm text-primary font-medium">Read more →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
