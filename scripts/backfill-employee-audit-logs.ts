import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, "../.env.local") });

import { prisma } from "../app/lib/prisma";

/**
 * Backfills EmployeeAuditLog from GlobalAuditLog for historical employee changes
 * This ensures "View History" shows all past changes, not just new ones after dual-write was enabled
 */
async function backfillEmployeeAuditLogs() {
  console.log("🔄 Starting EmployeeAuditLog backfill from GlobalAuditLog...\n");

  try {
    // Get all EMPLOYEE entity type records from GlobalAuditLog that have field changes
    const globalLogs = await prisma.globalAuditLog.findMany({
      where: {
        entityType: "EMPLOYEE",
        changes: {
          not: null,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    console.log(`📊 Found ${globalLogs.length} GlobalAuditLog entries for EMPLOYEE entity type\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const log of globalLogs) {
      try {
        // Extract field change information from the changes JSON
        const changes = log.changes as any;
        const metadata = log.metadata as any;

        // Determine field, oldValue, newValue, reason from changes structure
        let field: string | null = null;
        let oldValue: string | null = null;
        let newValue: string | null = null;
        let reason: string | null = null;

        if (changes && typeof changes === "object") {
          // New structure: { field, oldValue, newValue, reason }
          if (changes.field) {
            field = changes.field;
            oldValue = changes.oldValue || null;
            newValue = changes.newValue || null;
            reason = changes.reason || null;
          }
        }

        // Skip if we couldn't extract field information
        if (!field) {
          skipped++;
          continue;
        }

        // Extract employeeId and section from metadata or entityId
        const employeeId = metadata?.employeeId || log.entityId;
        const section = metadata?.section || "GENERAL";

        // Check if this audit entry already exists in EmployeeAuditLog
        // We check by matching employeeId, field, and timestamp (within 1 second)
        const startTime = new Date(log.timestamp);
        startTime.setSeconds(startTime.getSeconds() - 1);
        const endTime = new Date(log.timestamp);
        endTime.setSeconds(endTime.getSeconds() + 1);

        const existing = await prisma.employeeAuditLog.findFirst({
          where: {
            employeeId,
            field,
            changedAt: {
              gte: startTime,
              lte: endTime,
            },
            oldValue,
            newValue,
          },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Create EmployeeAuditLog entry
        await prisma.employeeAuditLog.create({
          data: {
            companyId: log.companyId,
            employeeId,
            section,
            field,
            oldValue,
            newValue,
            reason: reason || "Historical change",
            changedById: log.actorId,
            changedAt: log.timestamp,
          },
        });

        created++;

        // Progress indicator
        if (created % 10 === 0) {
          console.log(`✓ Processed ${created + skipped + errors}/${globalLogs.length} entries...`);
        }
      } catch (error) {
        errors++;
        console.error(`❌ Error processing log ${log.id}:`, error instanceof Error ? error.message : error);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📈 Backfill Summary:");
    console.log("=".repeat(60));
    console.log(`✅ Created: ${created} new EmployeeAuditLog entries`);
    console.log(`⏭️  Skipped: ${skipped} (already exist or no field data)`);
    console.log(`❌ Errors: ${errors}`);
    console.log(`📊 Total processed: ${globalLogs.length}`);
    console.log("=".repeat(60));

    // Verify the results
    console.log("\n🔍 Verification:");
    const totalEmployeeAuditLogs = await prisma.employeeAuditLog.count();
    console.log(`Total EmployeeAuditLog entries in database: ${totalEmployeeAuditLogs}`);

    console.log("\n✅ Backfill complete!");
  } catch (error) {
    console.error("\n❌ Backfill failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the backfill
backfillEmployeeAuditLogs().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
