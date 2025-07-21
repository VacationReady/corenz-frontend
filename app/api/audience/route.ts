// app/api/audience/route.ts

export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'  // Adjust this path if needed

export async function GET(req: NextRequest) {
  try {
    const [departments, jobRoles, locations] = await Promise.all([
      prisma.department.findMany({ select: { id: true, name: true } }),
      prisma.jobRole.findMany({ select: { id: true, name: true } }),
      prisma.location.findMany({ select: { id: true, name: true } }),
    ])

    return NextResponse.json({
      departments,
      jobRoles,
      locations,
    })
  } catch (error) {
    console.error('Error fetching audience data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audience data' },
      { status: 500 }
    )
  }
}
