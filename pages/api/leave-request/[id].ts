// pages/api/leave-request/[id].ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid ID" });
  }

  if (req.method === "GET") {
    try {
      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id },
      });
      if (!leaveRequest) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      if (leaveRequest.userId !== session.user.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      return res.status(200).json(leaveRequest);
    } catch (error) {
      console.error("Error fetching leave request:", error);
      return res.status(500).json({ error: "Failed to fetch leave request" });
    }
  }

  // Other methods (PUT, DELETE) can be added here if needed

  res.setHeader("Allow", ["GET"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
