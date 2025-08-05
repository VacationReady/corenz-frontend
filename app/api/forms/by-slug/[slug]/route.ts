import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// GET: Fetch form by slug
export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await prisma.form.findFirst({
      where: {
        slug: params.slug,
        companyId: session.user.companyId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        schema: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error("Error fetching form by slug:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
