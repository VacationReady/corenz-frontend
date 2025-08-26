import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional(),
  schemaJson: z.record(z.any()).refine((schema) => {
    // Basic validation that schema has required fields
    return schema && typeof schema === 'object' && Array.isArray(schema.fields);
  }, "Invalid form schema"),
});

const updateTemplateSchema = createTemplateSchema.partial();

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin/manager role
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const templates = await prisma.exitInterviewFormTemplate.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        name: true,
        description: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            offboardings: true,
            submissions: true
          }
        }
      }
    });

    return NextResponse.json(templates);

  } catch (error) {
    console.error('Error fetching exit interview templates:', error);
    return NextResponse.json({ 
      error: "Failed to fetch templates" 
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin/manager role
    if (!['ADMIN', 'MANAGER'].includes(session.user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const validatedData = createTemplateSchema.parse(body);

    const template = await prisma.exitInterviewFormTemplate.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        schemaJson: validatedData.schemaJson,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        description: template.description,
        isActive: template.isActive,
        createdAt: template.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating exit interview template:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Validation error", 
        details: error.errors 
      }, { status: 400 });
    }

    return NextResponse.json({ 
      error: "Failed to create template" 
    }, { status: 500 });
  }
}
