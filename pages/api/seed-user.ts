// pages/api/seed-user.ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  try {
    const hashedPassword = await bcrypt.hash("password123", 10);

    const user = await prisma.user.create({
      data: {
        email: "test@example.com",
        password: hashedPassword,
        name: "Test User",
        role: "ADMIN",
      },
    });

    res.status(200).json({ message: "Test user created", user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
