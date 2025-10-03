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
        startDate: true,
        User: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            dateOfBirth: true,
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
    
    // Format response with intelligent data display
    let answer = `${employees.length} people in ${department.name}:\n\n`;
    employees.forEach((emp, idx) => {
      const name = `${emp.User.firstName} ${emp.User.lastName}`;
      const role = emp.JobRole?.name ? ` - ${emp.JobRole.name}` : '';
      
      // Calculate age if DOB available
      let ageInfo = '';
      if (emp.User.dateOfBirth) {
        const dob = new Date(emp.User.dateOfBirth);
        const age = Math.floor((new Date().getTime() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        ageInfo = `\n   🎂 Age: ${age} years`;
      }
      
      // Calculate tenure if start date available
      let tenureInfo = '';
      if (emp.startDate) {
        const start = new Date(emp.startDate);
        const years = Math.floor((new Date().getTime() - start.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        const months = Math.floor(((new Date().getTime() - start.getTime()) / (30.44 * 24 * 60 * 60 * 1000)) % 12);
        if (years > 0) {
          tenureInfo = `\n   📅 Tenure: ${years}y ${months}m`;
        } else {
          tenureInfo = `\n   📅 Tenure: ${months} months`;
        }
      }
      
      const salary = emp.salaryAmount ? `\n   💰 Salary: $${Math.round(Number(emp.salaryAmount)).toLocaleString()}/year` : '';
      const email = `\n   📧 Email: ${emp.User.email}`;
      answer += `${idx + 1}. ${name}${role}${ageInfo}${tenureInfo}${salary}${email}\n`;
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

