import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, {
    ...authOptions,
    session: {
      strategy: "jwt", // ✅ Ensure JWT strategy for auth
    },
  });

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const leaveId = req.query.id as string;

  if (req.method === "PUT") {
    try {
      const { status } = req.body;

      const updatedLeave = await prisma.leaveRequest.update({
        where: { id: leaveId },
        data: {
          status,
          reviewedBy: session.user.id,
          reviewedAt: new Date(), // ✅ You now have this in your schema
        },
        include: {
          reviewer: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      return res.status(200).json(updatedLeave);
    } catch (error) {
      console.error("Error updating leave request:", error);
      return res.status(500).json({ error: "Failed to update leave request" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
