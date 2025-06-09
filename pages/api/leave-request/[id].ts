import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

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

      return res.status(200).json(leaveRequest);
    } catch (error) {
      console.error("Error fetching leave request:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else if (req.method === "PUT") {
    try {
      const { type, startDate, endDate, reason, status } = req.body;

      const updatedLeaveRequest = await prisma.leaveRequest.update({
        where: { id },
        data: {
          type,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : undefined,
          reason,
          status,
        },
      });

      return res.status(200).json(updatedLeaveRequest);
    } catch (error) {
      console.error("Error updating leave request:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else if (req.method === "DELETE") {
    try {
      await prisma.leaveRequest.delete({
        where: { id },
      });

      return res.status(204).end();
    } catch (error) {
      console.error("Error deleting leave request:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  } else {
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
