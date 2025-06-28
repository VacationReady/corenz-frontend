// pages/api/leave-request/[id].ts

import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import authOptions from "@/lib/auth-options";

export default async function handler(req, res) {
  const {
    query: { id },
    method,
  } = req;

  if (method === "PUT") {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status } = req.body;

    try {
      const updatedLeave = await prisma.leaveRequest.update({
        where: { id: id as string },
        data: {
          status,
          reviewedBy: session.user.id,
        },
        include: {
          reviewer: {
            select: { name: true },
          },
        },
      });

      return res.status(200).json(updatedLeave);
    } catch (error) {
      console.error("Error updating leave request:", error);
      return res.status(500).json({ error: "Server error" });
    }
  }

  res.setHeader("Allow", ["PUT"]);
  return res.status(405).end(`Method ${method} Not Allowed`);
}
