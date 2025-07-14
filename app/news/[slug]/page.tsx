import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import NewsContentRenderer from '@/components/news/NewsContentRenderer'
import DeleteNewsButton from '@/components/news/DeleteNewsButton'

interface Props {
  params: { slug: string }
}

export default async function NewsDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)

  const post = await prisma.newsPost.findUnique({
    where: { slug: params.slug },
    include: { author: true },
  })

  if (!post) return notFound()

  const isAuthor = session?.user?.id === post.authorId
  const isAdmin = session?.user?.role === 'ADMIN'

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-2">{post.title}</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Posted by {post.author.name || 'Unknown'} on{' '}
        {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString()}
      </p>

      <div className="mb-6">
        <NewsContentRenderer content={post.content} />
      </div>

      {post.videoEmbedUrl && (
        <div className="mb-6">
          <iframe
            src={post.videoEmbedUrl}
            className="w-full aspect-video rounded"
            allowFullScreen
          ></iframe>
        </div>
      )}

      {post.attachments.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-lg mb-2">Attachments</h2>
          <ul className="list-disc pl-5">
            {post.attachments.map((url, i) => (
              <li key={i}>
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  {url.split('/').pop()}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {post.audience?.type !== 'all' && (
        <div className="mb-6 text-sm text-muted-foreground">
          <p>Targeted Audience:</p>
          <ul className="list-disc pl-5">
            {post.audience.departments?.length > 0 && <li>Departments: {post.audience.departments.join(', ')}</li>}
            {post.audience.roles?.length > 0 && <li>Roles: {post.audience.roles.join(', ')}</li>}
            {post.audience.locations?.length > 0 && <li>Locations: {post.audience.locations.join(', ')}</li>}
          </ul>
        </div>
      )}

      {(isAdmin || isAuthor) && (
        <div className="mt-10 flex gap-3">
          <Link
            href={`/news/${params.slug}/edit`}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Edit
          </Link>

          <DeleteNewsButton slug={params.slug} />
        </div>
      )}
    </div>
  )
}
