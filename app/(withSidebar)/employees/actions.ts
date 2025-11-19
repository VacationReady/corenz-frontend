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
 * Server action that replaces POST /api/employees/[id]/send-invite
 */
export async function sendActivationEmailAction(employeeId: string) {
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
      include: {
        User: true,
      },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    // Call the existing API endpoint for sending email
    // (keeping this as API call since it involves external email service)
    const response = await fetch(
      `${process.env.NEXTAUTH_URL}/api/employees/${employeeId}/send-invite`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error || "Failed to send email" };
    }

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
