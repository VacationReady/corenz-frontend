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

// ✅ Resend Email Handler with Correct "Target All" Handling
async function sendNewsEmails(audience: any, title: string, content: any) {
  try {
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
            email: { not: null },   // ✅ Only fetch users with email
          },
          select: { email: true, firstName: true },
        })
      : await prisma.user.findMany({
          where: {
            ...filters,
            email: { not: null },   // ✅ Apply filters AND check for valid email
          },
          select: { email: true, firstName: true },
        })

    if (!users.length) {
      console.log('⚠️ No users matched the audience filter. No emails sent.')
      return
    }

    for (const user of users) {
      console.log(`📨 Sending email to ${user.email}`)
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
      })
    }
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
