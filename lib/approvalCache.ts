/**
 * Approval details cache for holiday approval modal performance
 * 
 * TTL: 5 minutes for approval details, 10 minutes for department colleagues
 * Key format: approval-details:{decisionId}
 * Key format: dept-colleagues:{companyId}:{departmentId}:{startDate}:{endDate}
 */

import { createCacheClient } from './cache';

/**
 * Approval details cache instance
 * 
 * TTL: 5 minutes (300 seconds)
 * Key format: approval-details:{decisionId}
 */
export const approvalDetailsCache = createCacheClient();

/**
 * Department colleagues cache instance
 * 
 * TTL: 10 minutes (600 seconds)
 * Key format: dept-colleagues:{companyId}:{departmentId}:{startDate}:{endDate}
 */
export const departmentColleaguesCache = createCacheClient();

/**
 * Helper to generate cache key for approval details
 */
export function generateApprovalDetailsCacheKey(decisionId: string): string {
  return `approval-details:${decisionId}`;
}

/**
 * Helper to generate cache key for department colleagues
 */
export function generateDepartmentColleaguesCacheKey(
  companyId: string,
  departmentId: string,
  startDate: string,
  endDate: string
): string {
  // Format dates as YYYY-MM-DD for consistency
  const start = startDate.split('T')[0];
  const end = endDate.split('T')[0];
  return `dept-colleagues:${companyId}:${departmentId}:${start}:${end}`;
}

/**
 * Invalidate approval details cache when decisions are updated
 */
export async function invalidateApprovalDetailsCache(decisionId: string): Promise<void> {
  const key = generateApprovalDetailsCacheKey(decisionId);
  await approvalDetailsCache.delete(key);
}

/**
 * Invalidate department colleagues cache when leave is approved/updated
 */
export async function invalidateDepartmentColleaguesCache(
  companyId: string,
  departmentId: string
): Promise<void> {
  const pattern = `dept-colleagues:${companyId}:${departmentId}:*`;
  await departmentColleaguesCache.deletePattern(pattern);
}
