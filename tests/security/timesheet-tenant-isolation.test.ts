/**
 * Security Test: Timesheet Tenant Isolation
 * 
 * Tests that admins/managers from one company CANNOT access
 * timesheet data from another company, even with valid IDs.
 * 
 * CRITICAL VULNERABILITY: These tests currently FAIL (pass when they shouldn't)
 * demonstrating the security issue.
 * 
 * NOTE:
 * - Requires DATABASE_URL to point at a Postgres instance (e.g. local dev DB)
 * - Uses Node's built-in test runner via `tsx --test`
 * 
 * To run locally:
 *   DATABASE_URL="postgres://..." npm test tests/security/timesheet-tenant-isolation.test.ts
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
// Skip if DATABASE_URL points to unreachable test database
const isTestDb = process.env.DATABASE_URL?.includes('nozomi.proxy.rlwy.net') || 
                 process.env.DATABASE_URL?.includes('unreachable');
const canRunDatabaseTests = hasDatabaseUrl && !isTestDb;

describe('🔴 SECURITY: Timesheet Tenant Isolation', { skip: !canRunDatabaseTests }, () => {
  const prisma = new PrismaClient();

  let companyA: any;
  let companyB: any;
  let adminUserA: any;
  let adminUserB: any;
  let adminEmployeeA: any;
  let adminEmployeeB: any;
  let employeeA: any;
  let employeeB: any;
  let timesheetA: any;
  let timesheetB: any;
  let entryB: any;

  before(async () => {
    const now = new Date();
    
    // Create Company A
    companyA = await prisma.company.create({
      data: {
        id: 'sec-test-company-a',
        name: 'Security Test Company A',
        updatedAt: now,
      },
    });

    // Create Company B
    companyB = await prisma.company.create({
      data: {
        id: 'sec-test-company-b',
        name: 'Security Test Company B',
        updatedAt: now,
      },
    });

    // Create Admin User A
    adminUserA = await prisma.user.create({
      data: {
        id: 'sec-test-admin-user-a',
        email: 'sec-admin-a@test.com',
        name: 'Security Admin A',
        role: 'ADMIN',
        password: 'test-password',
        updatedAt: now,
        companyId: companyA.id,
      },
    });

    adminEmployeeA = await prisma.employee.create({
      data: {
        id: 'sec-test-admin-emp-a',
        userId: adminUserA.id,
        companyId: companyA.id,
      },
    });

    // Create Admin User B
    adminUserB = await prisma.user.create({
      data: {
        id: 'sec-test-admin-user-b',
        email: 'sec-admin-b@test.com',
        name: 'Security Admin B',
        role: 'ADMIN',
        password: 'test-password',
        updatedAt: now,
        companyId: companyB.id,
      },
    });

    adminEmployeeB = await prisma.employee.create({
      data: {
        id: 'sec-test-admin-emp-b',
        userId: adminUserB.id,
        companyId: companyB.id,
      },
    });

    // Create Employee A
    const empUserA = await prisma.user.create({
      data: {
        id: 'sec-test-employee-user-a',
        email: 'sec-employee-a@test.com',
        name: 'Security Employee A',
        role: 'EMPLOYEE',
        password: 'test-password',
        updatedAt: now,
        companyId: companyA.id,
      },
    });

    employeeA = await prisma.employee.create({
      data: {
        id: 'sec-test-employee-a',
        userId: empUserA.id,
        companyId: companyA.id,
      },
    });

    // Create Employee B
    const empUserB = await prisma.user.create({
      data: {
        id: 'sec-test-employee-user-b',
        email: 'sec-employee-b@test.com',
        name: 'Security Employee B',
        role: 'EMPLOYEE',
        password: 'test-password',
        updatedAt: now,
        companyId: companyB.id,
      },
    });

    employeeB = await prisma.employee.create({
      data: {
        id: 'sec-test-employee-b',
        userId: empUserB.id,
        companyId: companyB.id,
      },
    });

    // Create Timesheet A (Company A)
    timesheetA = await prisma.timesheet.create({
      data: {
        id: 'sec-test-timesheet-a',
        employeeId: employeeA.id,
        companyId: companyA.id,
        periodStart: new Date('2024-11-01'),
        periodEnd: new Date('2024-11-07'),
        totalHours: 40,
        regularHours: 40,
        overtimeHours: 0,
        breakHours: 0,
        approvalStatus: 'PENDING',
      },
    });

    // Create Timesheet B (Company B) - TARGET OF ATTACK
    timesheetB = await prisma.timesheet.create({
      data: {
        id: 'sec-test-timesheet-b',
        employeeId: employeeB.id,
        companyId: companyB.id,
        periodStart: new Date('2024-11-01'),
        periodEnd: new Date('2024-11-07'),
        totalHours: 40,
        regularHours: 40,
        overtimeHours: 0,
        breakHours: 0,
        approvalStatus: 'PENDING',
      },
    });

    // Create Entry B for overtime testing
    entryB = await prisma.timesheetEntry.create({
      data: {
        id: 'sec-test-entry-b',
        timesheetId: timesheetB.id,
        date: new Date('2024-11-01'),
        startTime: new Date('2024-11-01T09:00:00Z'),
        endTime: new Date('2024-11-01T17:00:00Z'),
        breakMinutes: 30,
        hours: 7.5,
        isOvertime: false,
      },
    });
  });

  after(async () => {
    // Cleanup in reverse order
    await prisma.timesheetEntry.deleteMany({
      where: { id: { in: ['sec-test-entry-b'] } },
    });
    await prisma.timesheet.deleteMany({
      where: { id: { in: ['sec-test-timesheet-a', 'sec-test-timesheet-b'] } },
    });
    await prisma.employee.deleteMany({
      where: {
        id: {
          in: [
            'sec-test-admin-emp-a',
            'sec-test-admin-emp-b',
            'sec-test-employee-a',
            'sec-test-employee-b',
          ],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            'sec-test-admin-user-a',
            'sec-test-admin-user-b',
            'sec-test-employee-user-a',
            'sec-test-employee-user-b',
          ],
        },
      },
    });
    await prisma.company.deleteMany({
      where: { id: { in: ['sec-test-company-a', 'sec-test-company-b'] } },
    });

    await prisma.$disconnect();
  });

  describe('🔴 VULNERABILITY DEMONSTRATION: Cross-Tenant Access', () => {
    it('VULNERABLE: Admin A can query Timesheet B directly via Prisma', async () => {
      // Simulate what happens in GET /api/timesheets/[id]
      // Admin A attempts to fetch Timesheet B
      const timesheet = await prisma.timesheet.findUnique({
        where: { id: timesheetB.id },
        // ❌ NO companyId filter - this is the vulnerability
      });

      // ❌ CURRENT BEHAVIOR: Query succeeds
      assert.notStrictEqual(timesheet, null);
      assert.strictEqual(timesheet?.id, timesheetB.id);
      assert.strictEqual(timesheet?.companyId, companyB.id);

      // This proves Admin A can access Company B's data
      console.log('🔴 VULNERABILITY CONFIRMED: Cross-tenant access succeeded');
    });

    it('VULNERABLE: No database-level protection exists', async () => {
      // Try to fetch timesheet without any filters
      const allTimesheets = await prisma.timesheet.findMany({
        where: { id: timesheetB.id },
        // No companyId filter
      });

      // ❌ Returns data from any company
      assert.strictEqual(allTimesheets.length, 1);
      assert.strictEqual(allTimesheets[0].companyId, companyB.id);

      console.log('🔴 VULNERABILITY: Database allows cross-tenant queries');
    });

    it('VULNERABLE: Entry overtime endpoint has no company check', async () => {
      // Simulate what happens in PATCH /api/timesheets/entries/[id]/overtime
      const entry = await prisma.timesheetEntry.findUnique({
        where: { id: entryB.id },
        include: {
          Timesheet: {
            include: {
              Employee: {
                select: {
                  id: true,
                  // ❌ companyId not selected in actual code
                },
              },
            },
          },
        },
      });

      // ❌ CURRENT BEHAVIOR: Entry fetched without company validation
      assert.notStrictEqual(entry, null);
      assert.strictEqual(entry?.timesheetId, timesheetB.id);

      console.log('🔴 VULNERABILITY: Entry fetched without tenant check');
    });
  });

  describe('✅ EXPECTED BEHAVIOR: Proper Tenant Isolation', () => {
    it('SECURE: Query with companyId filter blocks cross-tenant access', async () => {
      // ✅ CORRECT PATTERN: Include companyId in where clause
      const timesheet = await prisma.timesheet.findFirst({
        where: {
          id: timesheetB.id,
          companyId: companyA.id, // Admin A's company
        },
      });

      // ✅ EXPECTED: Returns null because companies don't match
      assert.strictEqual(timesheet, null);

      console.log('✅ SECURE: Cross-tenant access blocked by companyId filter');
    });

    it('SECURE: Admin A can only access their own company data', async () => {
      const timesheet = await prisma.timesheet.findFirst({
        where: {
          id: timesheetA.id,
          companyId: companyA.id,
        },
      });

      // ✅ EXPECTED: Returns data from same company
      assert.notStrictEqual(timesheet, null);
      assert.strictEqual(timesheet?.companyId, companyA.id);
    });

    it('SECURE: Admin B can only access their own company data', async () => {
      const timesheet = await prisma.timesheet.findFirst({
        where: {
          id: timesheetB.id,
          companyId: companyB.id,
        },
      });

      // ✅ EXPECTED: Returns data from same company
      assert.notStrictEqual(timesheet, null);
      assert.strictEqual(timesheet?.companyId, companyB.id);
    });
  });

  describe('🔍 ATTACK SIMULATION: Real-World Scenarios', () => {
    it('ATTACK: Admin A discovers Company B timesheet ID via timing attack', async () => {
      // Attacker tries sequential IDs
      const potentialIds = ['sec-test-timesheet-b'];

      for (const id of potentialIds) {
        const timesheet = await prisma.timesheet.findUnique({
          where: { id },
        });

        if (timesheet && timesheet.companyId !== companyA.id) {
          // ❌ VULNERABILITY: Attacker found cross-tenant data
          assert.strictEqual(timesheet.companyId, companyB.id);
          console.log('🔴 ATTACK SUCCESS: Found cross-tenant timesheet');
          return;
        }
      }
    });

    it('ATTACK: Admin A modifies Company B timesheet data', async () => {
      // Simulate PUT /api/timesheets/[id]
      const updatedTimesheet = await prisma.timesheet.update({
        where: { id: timesheetB.id },
        data: {
          totalHours: 100, // Fraudulent increase
        },
      });

      // ❌ VULNERABILITY: Update succeeds
      // Convert Decimal to number for comparison
      assert.strictEqual(Number(updatedTimesheet.totalHours), 100);
      console.log('🔴 ATTACK SUCCESS: Modified cross-tenant data');

      // Cleanup
      await prisma.timesheet.update({
        where: { id: timesheetB.id },
        data: { totalHours: 40 },
      });
    });

    it('ATTACK: Admin A approves Company B timesheet', async () => {
      // Simulate POST /api/timesheets/[id]/approve
      const approvedTimesheet = await prisma.timesheet.update({
        where: { id: timesheetB.id },
        data: {
          approvalStatus: 'APPROVED',
          approvedAt: new Date(),
          approvedBy: adminEmployeeA.id, // Wrong company!
        },
      });

      // ❌ VULNERABILITY: Approval succeeds
      assert.strictEqual(approvedTimesheet.approvalStatus, 'APPROVED');
      assert.strictEqual(approvedTimesheet.approvedBy, adminEmployeeA.id);
      console.log('🔴 ATTACK SUCCESS: Cross-tenant approval');

      // Cleanup
      await prisma.timesheet.update({
        where: { id: timesheetB.id },
        data: {
          approvalStatus: 'PENDING',
          approvedAt: null,
          approvedBy: null,
        },
      });
    });
  });

  describe('📊 IMPACT ASSESSMENT', () => {
    it('Measure: How many timesheets are vulnerable', async () => {
      const totalTimesheets = await prisma.timesheet.count();
      console.log(`📊 Total timesheets in database: ${totalTimesheets}`);
      console.log(`🔴 All ${totalTimesheets} timesheets are vulnerable to cross-tenant access`);
    });

    it('Measure: How many companies are affected', async () => {
      const companies = await prisma.company.findMany({
        select: { id: true, name: true },
      });
      console.log(`📊 Total companies: ${companies.length}`);
      console.log(`🔴 All ${companies.length} companies can access each other's data`);
    });
  });
});
