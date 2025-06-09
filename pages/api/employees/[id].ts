// pages/api/employees/[id].ts

import { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma"; // Adjust this path if your prisma client is elsewhere

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (typeof id !== "string") {
    return res.status(400).json({ error: "Invalid employee ID" });
  }

  try {
    // Step 1: Delete any ActivationToken linked to this employee
    await prisma.activationToken.deleteMany({
      where: { employeeId: id },
    });

    // Step 2: Delete the employee record itself
    await prisma.employee.delete({
      where: { id },
    });

    return res.status(200).json({ message: "Employee deleted successfully" });
  } catch (error: any) {
    console.error("DELETE /api/employees/[id] error:", error);
    return res.status(500).json({ error: "Failed to delete employee" });
  }
}
