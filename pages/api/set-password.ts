// pages/api/set-password.ts

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: "Missing token or password" });
  }

  try {
    // 1. Validate token
    const storedToken = await prisma.activationToken.findUnique({
      where: { token },
    });

    if (!storedToken) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    // 2. Get user by token.userId
    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // 3. Get employee linked to user
    const employee = await prisma.employee.findUnique({
      where: { userId: user.id },
    });

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // 4. Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Update user password and mark employee as active + activated
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        isActivated: true,
        updatedAt: new Date(),
      },
    });

    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        isActive: true, // ✅ VALID FIELD
      },
    });

    // 6. Delete the token after use
    await prisma.activationToken.delete({
      where: { token },
    });

    return res.status(200).json({ message: "Password set successfully" });
  } catch (error) {
    console.error("Error in set-password:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
