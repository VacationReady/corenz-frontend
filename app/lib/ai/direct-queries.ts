/**
 * Direct Database Queries (Server-Side Only)
 * Bypasses AI for simple follow-up queries
 */

import { prisma } from "@/lib/prisma";

export async function directListEmployees(
  companyId: string,
  departmentName: string
): Promise<{ success: boolean; message: string; data: any[] }> {
  try {
    console.log('[Direct List] Querying department:', departmentName);
    
    // Find department
    const department = await prisma.department.findFirst({
      where: {
        companyId,
        name: { contains: departmentName, mode: 'insensitive' },
      },
    });
    
    if (!department) {
      console.log('[Direct List] Department not found:', departmentName);
      return {
        success: false,
        message: `Department "${departmentName}" not found.`,
        data: [],
      };
    }
    
    console.log('[Direct List] Found department:', department.name, department.id);
    
    // Get employees
    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        departmentId: department.id,
        isActive: true,
      },
      select: {
        id: true,
        salaryAmount: true,
        hourlyRate: true,
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        Department: {
          select: { name: true },
        },
        JobRole: {
          select: { name: true },
        },
      },
    });
    
    console.log('[Direct List] Found employees:', employees.length);
    
    if (employees.length === 0) {
      return {
        success: true,
        message: `No active employees found in ${department.name}.`,
        data: [],
      };
    }
    
    // Format response
    let answer = `${employees.length} people in ${department.name}:\n\n`;
    employees.forEach((emp, idx) => {
      const name = `${emp.User.firstName} ${emp.User.lastName}`;
      const role = emp.JobRole?.name ? ` - ${emp.JobRole.name}` : '';
      const salary = emp.salaryAmount ? `\n   💰 Salary: $${Math.round(Number(emp.salaryAmount)).toLocaleString()}/year` : '';
      const email = `\n   📧 Email: ${emp.User.email}`;
      answer += `${idx + 1}. ${name}${role}${salary}${email}\n`;
    });
    
    return {
      success: true,
      message: answer,
      data: employees,
    };
  } catch (error: any) {
    console.error('[Direct List] Error:', error);
    return {
      success: false,
      message: `Query failed: ${error.message}`,
      data: [],
    };
  }
}

