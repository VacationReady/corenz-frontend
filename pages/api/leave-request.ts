// pages/api/leave-request.ts

import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth-options";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const session = await getServerSession(req, res, authOptions);

    if (!session || !session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { type, startDate, endDate, reason } = req.body;

    try {
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id },
      });

      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }

      const newLeaveRequest = await prisma.leaveRequest.create({
        data: {
          userId: session.user.id,           // ✅ required
          employeeId: employee.id,           // ✅ required
          type,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason,
          status: "PENDING",
        },
      });

      return res.status(200).json(newLeaveRequest);
    } catch (error) {
      console.error("Error creating leave request:", error);
      return res.status(500).json({ error: "Server error" });
    }
  }

  // ✅ Only allow POST method — no rogue update() code
  res.setHeader("Allow", ["POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
