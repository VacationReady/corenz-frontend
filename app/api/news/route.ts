export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { getServerSession } from 'next-auth'
import { authOptions } from "@/lib/auth-options";

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) throw new Error('User not authenticated')
    const userId = session.user.id

    const body = await req.json()

    const { title, content, videoEmbedUrl, attachments, sendEmail, audience } = body

    console.log('📝 Incoming news POST:', { title, sendEmail, audience })

    const newsPost = await prisma.newsPost.create({
      data: {
        title,
        slug: generateSlug(title),
        content,
        videoEmbedUrl,
        attachments,
        sendEmail,
        audience,
        publishedAt: new Date(),
        author: { connect: { id: userId } },
      },
    })

    if (sendEmail) {
      await sendNewsEmails(audience, title, content)
    }

    return NextResponse.json(newsPost)
  } catch (error) {
    console.error('Error creating news post:', error)
    return NextResponse.json({ error: 'Failed to create news post' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get("limit") || "5", 10)

  const posts = await prisma.newsPost.findMany({
  orderBy: { createdAt: "desc" },
  take: limit,
  select: {
    id: true,
    title: true,
    slug: true,
    createdAt: true,
    content: true, // ✅ Needed for preview tooltip
  },
});

const postsWithPreview = posts.map(post => {
  const contentArray = Array.isArray(post.content) ? post.content : [];
const firstParagraph = contentArray.find((block: any) => block.type === "paragraph");
  return {
    ...post,
    preview: firstParagraph?.text ?? "",
  };
});

return NextResponse.json(postsWithPreview);

  return NextResponse.json(posts)
}

// ✅ Resend Email Handler with Batch Sending and Logging
async function sendNewsEmails(audience: any, title: string, content: any) {
  try {
    console.log('🚀 sendNewsEmails called with audience:', JSON.stringify(audience))

    let filters: any = {}

    if (audience.departments?.length) {
      filters.departmentId = { in: await getDepartmentIdsByName(audience.departments) }
    }
    if (audience.roles?.length) {
      filters.jobRoleId = { in: await getJobRoleIdsByName(audience.roles) }
    }
    if (audience.locations?.length) {
      filters.locationId = { in: await getLocationIdsByName(audience.locations) }
    }

    const users = audience?.type === 'all'
      ? await prisma.user.findMany({
          where: {
            email: { not: '' }
          },
          select: { email: true, firstName: true },
        })
      : await prisma.user.findMany({
          where: {
            ...filters,
            email: { not: '' },
          },
          select: { email: true, firstName: true },
        })

    console.log('👥 Found users:', users.map(u => u.email))

    if (!users.length) {
      console.log('⚠️ No users matched the audience filter. No emails sent.')
      return
    }

    // ✅ Batch send logic
    const batchRecipients = users.map((user) => ({
      from: 'onboarding@resend.dev',
      to: user.email,
      subject: `New News Post: ${title}`,
      html: `
        <p>Hi ${user.firstName || 'there'},</p>
        <p>There's a new news post on your portal.</p>
        <p><strong>${title}</strong></p>
        <p>${renderContentPreview(content)}</p>
        <p>Log in to view the full post.</p>
      `,
    }))

    console.log('📨 Sending batch of', batchRecipients.length, 'emails')

    for (const emailData of batchRecipients) {
      await resend.emails.send(emailData)
        .then(result => console.log('✅ Resend success:', result))
        .catch(err => console.error('❌ Resend failed:', err))
    }

    // ✅ If you want to switch back to single send, uncomment below:
    /*
    for (const user of users) {
      console.log(`📨 Sending Resend email to ${user.email}`)
      await resend.emails.send({
        from: 'onboarding@resend.dev',
        to: user.email,
        subject: `New News Post: ${title}`,
        html: `
          <p>Hi ${user.firstName || 'there'},</p>
          <p>There's a new news post on your portal.</p>
          <p><strong>${title}</strong></p>
          <p>${renderContentPreview(content)}</p>
          <p>Log in to view the full post.</p>
        `,
      }).catch(err => console.error('❌ Error sending email:', err))
    }
    */
  } catch (err) {
    console.error('Error sending emails via Resend:', err)
  }
}

// ✅ Content Preview Helper — unchanged
function renderContentPreview(content: any) {
  if (!Array.isArray(content)) return ''
  const firstParagraph = content.find((block: any) => block.type === 'paragraph')
  return firstParagraph ? firstParagraph.text : ''
}

// ✅ Helper Functions — unchanged
async function getDepartmentIdsByName(names: string[]) {
  const deps = await prisma.department.findMany({
    where: { name: { in: names } },
    select: { id: true },
  })
  return deps.map((d) => d.id)
}

async function getJobRoleIdsByName(names: string[]) {
  const roles = await prisma.jobRole.findMany({
    where: { name: { in: names } },
    select: { id: true },
  })
  return roles.map((r) => r.id)
}

async function getLocationIdsByName(names: string[]) {
  const locs = await prisma.location.findMany({
    where: { name: { in: names } },
    select: { id: true },
  })
  return locs.map((l) => l.id)
}

// ✅ Slug Generator — unchanged
function generateSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .slice(0, 50)
}
