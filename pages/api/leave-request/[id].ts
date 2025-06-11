import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

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
          reviewedById: session.user.id,
          reviewedAt: new Date(),
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
