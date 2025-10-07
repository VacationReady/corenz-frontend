// app/api/seed-user/route.ts - Migrated from Pages Router
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10);
    const company = await prisma.company.findFirst();
    if (!company) {
      throw new Error(
        "No company found. Seed companies before creating users.",
      );
    }

    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password: hashedPassword,
        name: "Test User",
        role: "ADMIN",
        companyId: company.id,
        id: crypto.randomUUID(),
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Test user created", user });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
