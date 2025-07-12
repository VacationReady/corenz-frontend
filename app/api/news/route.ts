import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/lib/auth-options'
import { Resend } from 'resend'
import slugify from 'slugify'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const body = await req.json()
  const { title, content, videoEmbedUrl, attachments, sendEmail } = body

  if (!title || !content) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
  }

  const slug = slugify(title, { lower: true, strict: true })

  const author = await prisma.user.findUnique({
    where: { email: session.user.email },
  })

  if (!author) {
    return NextResponse.json({ error: 'Author not found' }, { status: 404 })
  }

  const post = await prisma.newsPost.create({
    data: {
      title,
      slug,
      content,
      videoEmbedUrl,
      attachments,
      authorId: author.id,
      publishedAt: new Date(),
      sendEmail,
    },
  })

  if (sendEmail) {
    try {
      await resend.emails.send({
        from: 'CoreNZ News <news@corenz.app>',
        to: session.user.email, // 👈 Replace with audience list later
        subject: `📰 New Post: ${title}`,
        html: `<h1>${title}</h1><p>${typeof content === 'string' ? content : '[News post]'}</p><a href="https://yourdomain.com/news/${slug}">Read more</a>`,
      })
    } catch (err) {
      console.error('Email send error:', err)
    }
  }

  return NextResponse.json({ success: true, post })
}
