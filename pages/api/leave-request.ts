// pages/api/leave-request.ts

import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.method === "POST") {
    try {
      const { type, startDate, endDate, reason } = req.body;

      const newLeaveRequest = await prisma.leaveRequest.create({
        data: {
          userId: session.user.id,
          type,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason,
          status: "PENDING",
        },
      });

      return res.status(201).json(newLeaveRequest);
    } catch (error) {
      console.error("Error creating leave request:", error);
      return res.status(500).json({ error: "Failed to create leave request" });
    }
  }

  if (req.method === "GET") {
    try {
      const requests = await prisma.leaveRequest.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });
      return res.status(200).json(requests);
    } catch (error) {
      console.error("Error fetching leave requests:", error);
      return res.status(500).json({ error: "Failed to fetch leave requests" });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
