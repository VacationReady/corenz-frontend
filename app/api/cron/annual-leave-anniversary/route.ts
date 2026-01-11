/**
 * NZ Annual Leave Anniversary Cron Job
 * 
 * Processes annual leave entitlement grants for employees reaching their
 * 12-month employment anniversary, as required by the NZ Holidays Act 2003.
 * 
 * This endpoint is designed to be called by Vercel Cron daily at midnight NZ time.
 * 
 * @version 1.0
 * @date 2026
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyCronSecret, getUnauthorizedResponse } from "@/lib/cron/auth";
import { 
  processAllAnniversaryGrants, 
  type BatchGrantSummary 
} from "@/lib/leave/annual-leave-anniversary";

interface CompanyResult {
  companyId: string;
  companyName: string;
  summary: BatchGrantSummary;
}

interface CronJobResult {
  message: string;
  timestamp: string;
  companiesProcessed: number;
  totalEmployeesProcessed: number;
  totalSuccessful: number;
  totalFailed: number;
  totalFlagged: number;
  companyResults: CompanyResult[];
}

/**
 * Process anniversary grants for all companies
 */
async function processAllCompanies(): Promise<CronJobResult> {
  const startTime = Date.now();
  
  // Get all active companies
  const companies = await prisma.company.findMany({
    where: {
      // Only process active companies (if there's an isActive field)
      // For now, process all companies
    },
    select: {
      id: true,
      name: true,
    },
  });

  console.log(`📅 Starting annual leave anniversary processing for ${companies.length} companies`);

  const companyResults: CompanyResult[] = [];
  let totalEmployeesProcessed = 0;
  let totalSuccessful = 0;
  let totalFailed = 0;
  let totalFlagged = 0;

  for (const company of companies) {
    try {
      console.log(`\n🏢 Processing company: ${company.name} (${company.id})`);
      
      const summary = await processAllAnniversaryGrants(
        prisma,
        company.id,
        'SYSTEM_CRON' // Actor ID for audit trail
      );

      companyResults.push({
        companyId: company.id,
        companyName: company.name,
        summary,
      });

      totalEmployeesProcessed += summary.totalProcessed;
      totalSuccessful += summary.successCount;
      totalFailed += summary.failureCount;
      totalFlagged += summary.flaggedCount;

      // Log individual results for debugging
      if (summary.totalProcessed > 0) {
        console.log(`  ✅ Processed: ${summary.totalProcessed} employees`);
        console.log(`  ✅ Successful: ${summary.successCount}`);
        if (summary.failureCount > 0) {
          console.log(`  ❌ Failed: ${summary.failureCount}`);
        }
        if (summary.flaggedCount > 0) {
          console.log(`  ⚠️ Flagged for review: ${summary.flaggedCount}`);
        }
      } else {
        console.log(`  ℹ️ No employees at anniversary`);
      }
    } catch (error) {
      console.error(`❌ Error processing company ${company.name}:`, error);
      
      // Record the error but continue with other companies
      companyResults.push({
        companyId: company.id,
        companyName: company.name,
        summary: {
          totalProcessed: 0,
          successCount: 0,
          failureCount: 1,
          flaggedCount: 0,
          results: [{
            employeeId: 'N/A',
            grantedDays: 0,
            leaveInAdvanceDeducted: 0,
            finalBalance: 0,
            flaggedForReview: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          }],
        },
      });
      totalFailed++;
    }
  }

  const duration = Date.now() - startTime;
  console.log(`\n📊 Anniversary processing complete in ${duration}ms`);
  console.log(`   Total companies: ${companies.length}`);
  console.log(`   Total employees processed: ${totalEmployeesProcessed}`);
  console.log(`   Successful grants: ${totalSuccessful}`);
  console.log(`   Failed grants: ${totalFailed}`);
  console.log(`   Flagged for review: ${totalFlagged}`);

  return {
    message: 'Annual leave anniversary processing completed',
    timestamp: new Date().toISOString(),
    companiesProcessed: companies.length,
    totalEmployeesProcessed,
    totalSuccessful,
    totalFailed,
    totalFlagged,
    companyResults,
  };
}

/**
 * GET handler for Vercel Cron
 * 
 * Vercel Cron calls GET endpoints. This handler:
 * 1. Verifies the cron secret for security
 * 2. Processes anniversary grants for all companies
 * 3. Returns a summary of results
 */
export async function GET(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    if (!verifyCronSecret(req)) {
      console.error('❌ Unauthorized cron request to annual-leave-anniversary');
      return getUnauthorizedResponse();
    }

    console.log('🔐 Cron authentication successful');
    
    const result = await processAllCompanies();
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('❌ Error in annual leave anniversary cron job:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler for manual/managed cron services
 * 
 * Some cron services use POST instead of GET. This handler
 * provides the same functionality as GET.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify this is a legitimate cron call
    if (!verifyCronSecret(req)) {
      console.error('❌ Unauthorized cron request to annual-leave-anniversary');
      return getUnauthorizedResponse();
    }

    console.log('🔐 Cron authentication successful');
    
    const result = await processAllCompanies();
    
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('❌ Error in annual leave anniversary cron job:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
