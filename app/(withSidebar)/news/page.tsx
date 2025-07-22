import { getAllNewsPosts } from '@/lib/news/getAllNewsPosts'
import Link from 'next/link'
import { format } from 'date-fns'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import Button from '@/components/ui/Button'

export default async function NewsPage() {
  const posts = await getAllNewsPosts()
  const session = await getServerSession(authOptions)

  let canPost = false
  if (session?.user?.email) {
    const dbUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (dbUser?.role === 'ADMIN' || dbUser?.role === 'MANAGER') {
      canPost = true
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Company News</h1>

        {canPost && (
          <Link href="/news/create">
            <Button>Create News</Button>
          </Link>
        )}
      </div>

      <div className="space-y-6">
        {posts.map((post) => (
          <Link key={post.id} href={`/news/${post.slug}`}>
            <div className="border rounded-lg p-4 hover:bg-gray-50 transition">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">{post.title}</h2>
                {post.publishedAt && (
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(post.publishedAt), 'dd MMM yyyy')}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                By {post.author?.name ?? 'Unknown'}
              </p>
              <p className="mt-2 text-gray-700 line-clamp-3">
                {typeof post.content === 'string'
                  ? post.content.slice(0, 150)
                  : '[Rich content]'}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
