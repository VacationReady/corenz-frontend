import { getNewsPostBySlug } from '@/lib/news/getNewsPostBySlug'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import Image from 'next/image'
import dynamic from 'next/dynamic'

// Dynamically import to ensure client-side rendering
const NewsContentRenderer = dynamic(() => import('@/components/news/NewsContentRenderer'), { ssr: false })

interface Props {
  params: { slug: string }
}

export default async function NewsDetailPage({ params }: Props) {
  const post = await getNewsPostBySlug(params.slug)

  if (!post || !post.publishedAt) return notFound()

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
    </div>
  )
}
