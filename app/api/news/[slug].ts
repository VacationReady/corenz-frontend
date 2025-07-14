import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { sendNewsEmail } from '@/lib/news/sendNewsEmail'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { slug } = req.query

  if (typeof slug !== 'string') {
    return res.status(400).json({ error: 'Invalid slug' })
  }

  const existing = await prisma.newsPost.findUnique({
    where: { slug },
    include: { author: true },
  })

  if (!existing) {
    return res.status(404).json({ error: 'Post not found' })
  }

  const isAuthor = existing.authorId === session.user.id
  const isAdmin = session.user.role === 'ADMIN'

  if (!isAuthor && !isAdmin) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  switch (req.method) {
    case 'GET':
      return res.status(200).json(existing)

    case 'PUT': {
      const { title, content, videoEmbedUrl, attachments, sendEmail, audience } = req.body

      const updated = await prisma.newsPost.update({
        where: { slug },
        data: {
          title,
          content,
          videoEmbedUrl,
          attachments,
          sendEmail,
          audience: audience || { type: 'all' },
          updatedAt: new Date(),
        },
      })

      if (sendEmail) {
        const recipients = await prisma.user.findMany({
          where: { email: { not: '' } },
          select: { email: true },
        })

        await sendNewsEmail({
          title: updated.title,
          slug: updated.slug,
          recipients: recipients.map((u) => u.email!) || [],
        })
      }

      return res.status(200).json(updated)
    }

    case 'DELETE': {
      await prisma.newsPost.delete({
        where: { slug },
      })

      return res.status(204).end()
    }

    default:
      return res.status(405).json({ error: 'Method not allowed' })
  }
}
