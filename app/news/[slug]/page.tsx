import { getNewsPostBySlug } from '@/lib/news/getNewsPostBySlug'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth-options'
import { notFound, redirect } from 'next/navigation'
import { format } from 'date-fns'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import Link from 'next/link'

// Dynamically import to ensure client-side rendering
const NewsContentRenderer = dynamic(() => import('@/components/news/NewsContentRenderer'), { ssr: false })

interface Props {
  params: { slug: string }
}

export default async function NewsDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  const post = await getNewsPostBySlug(params.slug)

  if (!post || !post.publishedAt) return notFound()

  const isAuthor = session?.user?.id === post.authorId
  const isAdmin = session?.user?.role === 'admin'

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold">{post.title}</h1>
      <p className="text-sm text-muted-foreground mt-1">
        By {post.author?.name ?? 'Unknown'} •{' '}
        {format(new Date(post.publishedAt), 'dd MMM yyyy')}
      </p>

      {/* Optional video */}
      {post.videoEmbedUrl && (
        <div className="mt-6">
          <iframe
            src={post.videoEmbedUrl}
            className="w-full aspect-video rounded"
            allowFullScreen
          />
        </div>
      )}

      {/* Rich content */}
      <div className="mt-6">
        {Array.isArray(post.content) ? (
          <NewsContentRenderer content={post.content as any} />
        ) : typeof post.content === 'string' ? (
          <p className="text-gray-700">{post.content}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">[No content]</p>
        )}
      </div>

      {/* Attachments */}
      {post.attachments && post.attachments.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-2">Attachments</h3>
          <ul className="list-disc list-inside text-blue-600">
            {post.attachments.map((url, i) => (
              <li key={i}>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {url.split('/').pop()}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Edit/Delete controls */}
      {(isAdmin || isAuthor) && (
        <div className="mt-10 flex gap-3">
          <Link
            href={`/news/${params.slug}/edit`}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit
          </Link>
          <form
            action={`/api/news/${params.slug}`}
            method="POST"
            onSubmit={(e) => {
              if (!confirm('Are you sure you want to delete this post?')) {
                e.preventDefault()
              }
            }}
          >
            <input type="hidden" name="_method" value="DELETE" />
            <button
              type="submit"
              className="text-sm px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
