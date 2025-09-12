// pages/api/seed-user.ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
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
        company: { connect: { id: company.id } },
      },
    });

    res.status(200).json({ message: "Test user created", user });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
