import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY ?? '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const employee = await prisma.employee.findUnique({ where: { email } });

    if (!employee) {
      return res.status(400).json({ error: "Employee not found" });
    }

    // Generate activation token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    // Store token in DB linked to employee
    await prisma.activationToken.create({
      data: {
        token,
        employeeId: employee.id,
        expiresAt,
      },
    });

    // Send activation email with Resend
    const activationLink = `${process.env.NEXT_PUBLIC_APP_URL}/activate?token=${token}`;

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "Activate Your CoreNZ Account",
      html: `
        <p>Hello,</p>
        <p>Please activate your account by clicking <a href="${activationLink}">here</a>.</p>
        <p>This link expires in 24 hours.</p>
      `,
    });

    return res.status(200).json({ message: "Activation email sent." });
  } catch (error) {
    console.error("Error in activation route:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
