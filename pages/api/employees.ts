import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import { v4 as uuidv4 } from "uuid";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    try {
      const { firstName, lastName, email, phone, department, jobRole } = req.body;

      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now

      const newEmployee = await prisma.employee.create({
        data: {
          firstName,
          lastName,
          email,
          phone,
          department,
          jobRole,
          isActive: false,
          activationTokens: {
            create: {
              token,
              expiresAt,
            },
          },
        },
      });

      const activationLink = `https://corenz-frontend.vercel.app/activate?token=${token}`;

      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Activate Your CoreNZ Account",
        html: `<p>Hello ${firstName},</p><p>Click <a href="${activationLink}">here</a> to activate your account.</p>`,
      });

      return res.status(201).json({ message: "Employee created and email sent." });
    } catch (error) {
      console.error("Error in employee creation:", error);
      return res.status(500).json({ error: "Something went wrong." });
    }
  } else if (req.method === "GET") {
    try {
      const employees = await prisma.employee.findMany();
      return res.status(200).json(employees);
    } catch (error) {
      console.error("Error fetching employees:", error);
      return res.status(500).json({ error: "Failed to load employees" });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
