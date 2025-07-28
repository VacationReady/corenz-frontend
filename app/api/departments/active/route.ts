import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth"; // ✅ If you use auth to scope by company
import { authOptions } from "@/lib/auth-options"; // Adjust path as needed

export async function GET() {
  try {
    // ✅ Get user session (if scoping by company is required)
    const session = await getServerSession(authOptions);
    if (!session?.user?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const departments = await prisma.department.findMany({
      where: {
        active: true, 
        companyId: session.user.companyId, // ✅ Multi-tenant scoping
      },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return NextResponse.json(departments); // ✅ Raw array for dropdown
  } catch (error) {
    console.error("Error fetching active departments:", error);
    return NextResponse.json({ error: "Failed to fetch active departments" }, { status: 500 });
  }
}
