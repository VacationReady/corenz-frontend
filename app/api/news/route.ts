export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const { title, content, videoEmbedUrl, attachments, sendEmail, audience } = body

    const newsPost = await prisma.newsPost.create({
      data: {
        title,
        content,
        videoEmbedUrl,
        attachments,
        sendEmail,
        audience,
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

// ✅ Added Resend Email Handler (Keeps all your original logic intact)
async function sendNewsEmails(audience: any, title: string, content: any) {
  try {
    let filters: any = {}

    if (audience?.type === 'all') {
      // No filters, send to all users
    } else {
      if (audience.departments?.length) {
        filters.departmentId = { in: await getDepartmentIdsByName(audience.departments) }
      }
      if (audience.roles?.length) {
        filters.jobRoleId = { in: await getJobRoleIdsByName(audience.roles) }
      }
      if (audience.locations?.length) {
        filters.locationId = { in: await getLocationIdsByName(audience.locations) }
      }
    }

    const users = await prisma.user.findMany({
      where: filters,
      select: { email: true, firstName: true },
    })

    for (const user of users) {
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

// ✅ Content Preview Helper
function renderContentPreview(content: any) {
  if (!Array.isArray(content)) return ''
  const firstParagraph = content.find((block: any) => block.type === 'paragraph')
  return firstParagraph ? firstParagraph.text : ''
}

// ✅ Helper Functions to Get IDs
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
