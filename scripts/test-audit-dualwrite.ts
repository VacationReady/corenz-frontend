import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import { prisma } from "../app/lib/prisma";
import { auditLog } from "../app/lib/audit";

async function testDualWrite() {
  try {
    console.log("Testing audit log dual-write...");
    console.log("UNIFIED_AUDIT_DUALWRITE:", process.env.UNIFIED_AUDIT_DUALWRITE);

    // Get a test employee
    const employee = await prisma.employee.findFirst({
      include: { User: true },
    });

    if (!employee) {
      console.error("No employee found for testing");
      return;
    }

    console.log("\nTest employee:", {
      id: employee.id,
      name: employee.User.name,
      email: employee.User.email,
    });

    // Test the audit log function
    console.log("\nCalling auditLog with employee field change...");
    await auditLog({
      entityType: "EMPLOYEE",
      entityId: employee.id,
      action: "UPDATED",
      actorId: employee.User.id,
      actorType: "USER",
      companyId: employee.companyId,
      employeeId: employee.id,
      section: "personal-info",
      field: "lastName",
      oldValue: "TestOld",
      newValue: "TestNew",
      reason: "Testing dual-write functionality",
    });

    console.log("\nChecking if records were created...");

    // Check GlobalAuditLog
    const globalAuditCount = await prisma.globalAuditLog.count({
      where: {
        entityType: "EMPLOYEE",
        entityId: employee.id,
        metadata: {
          path: ["employeeId"],
          equals: employee.id,
        },
      },
    });
    console.log(`GlobalAuditLog records for employee: ${globalAuditCount}`);

    // Check EmployeeAuditLog
    const employeeAuditCount = await prisma.employeeAuditLog.count({
      where: {
        employeeId: employee.id,
      },
    });
    console.log(`EmployeeAuditLog records for employee: ${employeeAuditCount}`);

    // Get the latest records
    const latestGlobal = await prisma.globalAuditLog.findFirst({
      where: {
        entityType: "EMPLOYEE",
        entityId: employee.id,
      },
      orderBy: { timestamp: "desc" },
    });
    console.log("\nLatest GlobalAuditLog entry:", latestGlobal);

    const latestEmployee = await prisma.employeeAuditLog.findFirst({
      where: {
        employeeId: employee.id,
      },
      orderBy: { changedAt: "desc" },
    });
    console.log("\nLatest EmployeeAuditLog entry:", latestEmployee);

    console.log("\n✓ Test complete!");
  } catch (error) {
    console.error("Test failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testDualWrite();
