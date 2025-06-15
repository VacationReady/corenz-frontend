import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  try {
    const employees = await prisma.user.findMany({
      where: { isActive: true },
      include: { manager: true },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("GET /api/employees error:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to fetch employees" }), {
      status: 500,
    });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return new NextResponse(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await req.json();

  try {
    const newUser = await prisma.user.create({
      data: {
        ...body,
      },
    });

    return NextResponse.json(newUser);
  } catch (error) {
    console.error("POST /api/employees error:", error);
    return new NextResponse(JSON.stringify({ error: "Failed to add employee" }), {
      status: 500,
    });
  }
}
