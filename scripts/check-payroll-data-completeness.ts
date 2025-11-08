/**
 * Script to identify employees with incomplete payroll data
 * Run with: npx ts-node scripts/check-payroll-data-completeness.ts
 */

import { PrismaClient } from "@prisma/client";
import { isPayrollDataComplete } from "@/lib/payroll/nz-payroll-validation";

const prisma = new PrismaClient();

interface IncompleteEmployee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  department: string | null;
  missing: string[];
}

async function checkPayrollDataCompleteness() {
  console.log("🔍 Checking payroll data completeness...\n");

  try {
    const companies = await prisma.company.findMany({
      select: { id: true, name: true },
    });

    for (const company of companies) {
      console.log(`\n📊 Company: ${company.name}`);
      console.log("=".repeat(60));

      const employees = await prisma.employee.findMany({
        where: {
          companyId: company.id,
          isActive: true,
        },
        include: {
          User: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          Department: {
            select: {
              name: true,
            },
          },
        },
      });

      const incompleteEmployees: IncompleteEmployee[] = [];
      let completeCount = 0;

      for (const employee of employees) {
        const { complete, missing } = isPayrollDataComplete({
          irdNumber: employee.irdNumber,
          taxCode: employee.taxCode,
          kiwiSaverEnrolled: employee.kiwiSaverEnrolled ?? false,
          kiwiSaverEmployeeRate: employee.kiwiSaverEmployeeRate
            ? Number(employee.kiwiSaverEmployeeRate)
            : null,
          hasStudentLoan: employee.hasStudentLoan,
          studentLoanRate: employee.studentLoanRate
            ? Number(employee.studentLoanRate)
            : null,
        });

        if (!complete) {
          incompleteEmployees.push({
            id: employee.id,
            firstName: employee.User.firstName,
            lastName: employee.User.lastName,
            email: employee.User.email,
            department: employee.Department?.name || null,
            missing,
          });
        } else {
          completeCount++;
        }
      }

      // Print summary
      const total = employees.length;
      const incompleteCount = incompleteEmployees.length;
      const completionRate = total > 0 ? ((completeCount / total) * 100).toFixed(1) : "0";

      console.log(`\nTotal Active Employees: ${total}`);
      console.log(`✅ Complete: ${completeCount} (${completionRate}%)`);
      console.log(`❌ Incomplete: ${incompleteCount}`);

      if (incompleteEmployees.length > 0) {
        console.log("\n📋 Employees with Incomplete Data:\n");
        console.log(
          "ID".padEnd(30) +
          "Name".padEnd(30) +
          "Email".padEnd(35) +
          "Department".padEnd(20) +
          "Missing Fields"
        );
        console.log("-".repeat(150));

        for (const emp of incompleteEmployees) {
          const name = `${emp.firstName} ${emp.lastName}`;
          const dept = emp.department || "N/A";
          console.log(
            emp.id.slice(0, 28).padEnd(30) +
            name.slice(0, 28).padEnd(30) +
            emp.email.slice(0, 33).padEnd(35) +
            dept.slice(0, 18).padEnd(20) +
            emp.missing.join(", ")
          );
        }

        // Export CSV
        console.log("\n📄 Exporting CSV template...");
        const csvLines = [
          "employeeId,firstName,lastName,email,department,irdNumber,taxCode,kiwiSaverEnrolled,kiwiSaverEmployeeRate,kiwiSaverEmployerRate,hasStudentLoan,studentLoanRate",
        ];

        for (const emp of incompleteEmployees) {
          const dept = emp.department || "";
          csvLines.push(
            `${emp.id},"${emp.firstName}","${emp.lastName}",${emp.email},"${dept}","","","","","","",""`
          );
        }

        const csvContent = csvLines.join("\n");
        const fs = require("fs");
        const csvPath = `payroll-data-incomplete-${company.name.replace(/[^a-z0-9]/gi, "_")}-${Date.now()}.csv`;
        fs.writeFileSync(csvPath, csvContent);
        console.log(`✅ CSV saved: ${csvPath}`);
      }
    }

    console.log("\n✅ Check complete!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
checkPayrollDataCompleteness();
