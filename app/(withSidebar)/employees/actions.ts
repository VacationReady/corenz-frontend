"use server";

/**
 * Server Actions for Employee Management
 * 
 * Next.js 15 server actions for employee mutations.
 * These replace client-side API calls for better performance and security.
 * 
 * Related:
 * - Prompt 6: Paginated API implementation
 * - Prompt 7: Frontend pagination updates
 * - Prompt 8: Server-first architecture
 */

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { resend } from "@/lib/resend";
import { getAppBaseUrl, renderPeopleCoreEmail } from "@/lib/email/template";

/**
 * Delete an employee
 * Server action that replaces DELETE /api/employees/[id]
 */
export async function deleteEmployeeAction(employeeId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.companyId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify employee belongs to company
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.user.companyId,
      },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    // Delete employee
    await prisma.employee.delete({
      where: { id: employeeId },
    });

    // Revalidate employees page
    revalidatePath("/employees");
    
    return { success: true };
  } catch (error) {
    console.error("[deleteEmployeeAction]", error);
    return { success: false, error: "Failed to delete employee" };
  }
}

/**
 * Send activation email to employee
 * Server action that sends activation email directly (no API call needed)
 */
export async function sendActivationEmailAction(employeeId: string) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.companyId) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    // Verify employee belongs to company and get user data
    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        companyId: session.user.companyId,
      },
      include: {
        User: true,
      },
    });

    if (!employee?.User) {
      return { success: false, error: "Employee not found" };
    }

    // Create or rotate activation token
    const activationToken = randomBytes(32).toString("hex");
    await prisma.activationToken.upsert({
      where: { userId: employee.User.id },
      update: { token: activationToken },
      create: { 
        id: crypto.randomUUID(), 
        userId: employee.User.id, 
        token: activationToken 
      },
    });

    // Build activation link
    const redirectPath = employee.onboardingTemplateId
      ? `/${employee.id}/onboarding`
      : `/dashboard`;
    const baseUrl = getAppBaseUrl();
    const activationLink = `${baseUrl}/activate?token=${activationToken}&companyId=${encodeURIComponent(
      session.user.companyId,
    )}&redirect=${encodeURIComponent(redirectPath)}`;

    // Get employee name for email
    const employeeName =
      `${employee.User.firstName ?? ""} ${employee.User.lastName ?? ""}`.trim() ||
      employee.User.email;

    // Render email template
    const { html, text } = renderPeopleCoreEmail({
      preheader: "Activate your PeopleCore account",
      title: "Activate Your PeopleCore Account",
      intro: [
        `Hi ${employeeName},`,
        "Welcome to PeopleCore! Use the button below to activate your account and get started.",
      ],
      ctas: {
        label: "Activate Account",
        href: activationLink,
      },
      outro: [
        "If you weren't expecting this email, please ignore it.",
        "Thank you,",
        "The PeopleCore Team",
      ],
    });

    // Send email via Resend
    await resend.emails.send({
      from: "noreply@peoplecore.co.nz",
      to: employee.User.email,
      subject: "Activate Your PeopleCore Account",
      html,
      text,
    });

    return { success: true };
  } catch (error) {
    console.error("[sendActivationEmailAction]", error);
    return { success: false, error: "Failed to send activation email" };
  }
}

/**
 * Refresh employees data
 * Revalidates the employees page cache
 */
export async function refreshEmployeesAction() {
  revalidatePath("/employees");
  return { success: true };
}
