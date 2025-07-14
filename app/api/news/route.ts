import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import slugify from 'slugify'
import { sendNewsEmail } from '@/lib/news/sendNewsEmail'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()

  const slug = slugify(body.title, { lower: true, strict: true })

  try {
    const post = await prisma.newsPost.create({
      data: {
        title: body.title,
        slug,
        content: body.content,
        authorId: session.user.id,
        publishedAt: new Date(),
        pinned: false,
        tags: body.tags || [],
        audience: body.audience || { type: 'all' },
        attachments: body.attachments || [],
        videoEmbedUrl: body.videoEmbedUrl || null,
        sendEmail: body.sendEmail || false,
      },
    })

    if (body.sendEmail) {
      const recipients = await prisma.user.findMany({
        where: { email: { not: '' } },
        select: { email: true },
      })

      await sendNewsEmail({
        title: post.title,
        slug: post.slug,
        recipients: recipients.map((u) => u.email!) || [],
      })
    }

    return NextResponse.json(post)
  } catch (error) {
    console.error('Error creating news post:', error)
    return NextResponse.json({ error: 'Failed to create news post.' }, { status: 500 })
  }
}
