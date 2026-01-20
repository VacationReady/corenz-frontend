# Holiday Approval Modal Performance Optimization

## Overview
This optimization addresses the slow loading of the holiday approval modal from the action items widget by implementing batch calculations, caching, and query optimizations.

## Performance Improvements Implemented

### 1. Database Optimizations ✅
- **Added performance indexes** for LeaveRequest queries:
  - `LeaveRequest_companyId_departmentId_startDate_endDate_status_idx`
  - `LeaveRequest_approvalStatus_startDate_idx`
  - `LeaveRequest_employeeId_startDate_idx`
  - `LeaveRequest_companyId_approvalStatus_idx`

### 2. Batch Leave Deduction Calculation ✅
- **Created enhanced batch function**: `calculateLeaveDeductionBatchEnhanced()`
  - Fetches working pattern data once instead of per-day queries
  - Supports public holidays and edge cases
  - Returns detailed results with notes for each day
- **Replaced per-day loop** in approval details API
  - Before: N+1 queries (one for each day of leave)
  - After: 1 query for all days regardless of leave duration

### 3. Server-Side Caching ✅
- **Approval details cache**: 5-minute TTL
  - Key format: `approval-details:{decisionId}`
- **Department colleagues cache**: 10-minute TTL  
  - Key format: `dept-colleagues:{companyId}:{departmentId}:{startDate}:{endDate}`
- **Cache invalidation** on approval actions
- **Redis + Memory fallback** using existing infrastructure

### 4. Client-Side SWR Optimization ✅
- **Deduping interval**: 5 minutes (300,000ms)
- **Revalidate on focus**: Disabled
- **Response caching headers**: `Cache-Control: public, max-age=300, stale-while-revalidate=600`

### 5. Query Optimization ✅
- **Optimized department colleagues query** with selective fields
- **Reduced database payload** by selecting only essential columns
- **Maintained result accuracy** for large and small departments

## Performance Impact

### Before Optimization
- **Day-by-day calculation**: 10+ database queries for 2-week leave
- **No caching**: Fresh database fetch on every modal open
- **Full colleague queries**: All fields fetched unnecessarily
- **No client-side caching**: Repeated API calls

### After Optimization
- **Batch calculation**: 1 database query regardless of leave duration
- **Multi-level caching**: Redis/memory + HTTP headers + SWR
- **Optimized queries**: Only essential fields selected
- **Smart caching**: 5-10 minute TTLs with invalidation

### Expected Performance Gains
- **Database queries**: Reduced by 80-90% for approval details
- **Modal load time**: 2-5x faster on repeat opens
- **Server response time**: 50-70% faster on cache hits
- **Database load**: Significantly reduced during peak usage

## Testing Strategy

### Unit Tests ✅
- **calculateLeaveDeductionBatch.test.ts**: Comprehensive test coverage
  - Basic functionality (single day, multi-day)
  - Edge cases (no pattern, cross-month, partial days)
  - Public holiday support
  - Backward compatibility with original function
  - Performance scenarios

### Integration Tests ✅
- **approval-details-api.performance.test.ts**: API-level testing
  - Caching behavior (hit/miss scenarios)
  - Batch calculation performance
  - Query optimization verification
  - Cache TTL and invalidation

### End-to-End Tests ✅
- **holiday-approval-modal.e2e.test.tsx**: UI performance testing
  - Loading state performance
  - Render time budgets (<100ms)
  - User interaction responsiveness (<50ms)
  - SWR caching behavior
  - Error handling

## Regression Prevention

### Backward Compatibility
- **Enhanced batch function** maintains same API as original
- **Original function** remains untouched for comparison
- **Comprehensive test suite** validates identical results
- **Gradual rollout** possible with feature flags

### Cache Safety
- **Non-blocking cache failures**: System works if Redis is down
- **Automatic fallback**: Memory cache when Redis unavailable
- **Safe invalidation**: Cache failures don't break approvals
- **TTL-based expiration**: Prevents stale data issues

### Database Safety
- **Read-only optimizations**: No changes to write operations
- **Index additions**: Non-breaking performance improvements
- **Query optimization**: Same results, better performance
- **Transaction safety**: All operations maintain ACID compliance

## Files Modified

### New Files
- `prisma/migrations/20250120000000_optimize_leave_request_performance/migration.sql`
- `lib/approvalCache.ts`
- `app/lib/calculateLeaveDeductionBatchEnhanced.ts`
- `tests/calculateLeaveDeductionBatch.test.ts`
- `tests/approval-details-api.performance.test.ts`
- `tests/holiday-approval-modal.e2e.test.tsx`

### Modified Files
- `lib/cache.ts` (exported createCacheClient)
- `app/api/approvals/[id]/details/route.ts` (batch calculation + caching)
- `app/api/approvals/[id]/route.ts` (cache invalidation)
- `components/approvals/HolidayApprovalModal.tsx` (SWR optimization)

## Deployment Instructions

### 1. Database Migration
```bash
npx prisma migrate deploy
```

### 2. Environment Variables
Ensure Redis configuration is available:
```env
KV_REST_API_URL=your_redis_url
KV_REST_API_TOKEN=your_redis_token
```

### 3. Testing
```bash
# Run unit tests
npm test -- calculateLeaveDeductionBatch.test.ts

# Run integration tests  
npm test -- approval-details-api.performance.test.ts

# Run e2e tests
npm test -- holiday-approval-modal.e2e.test.tsx

# Run all optimization tests
npm test -- --testNamePattern="Performance|Optimization|Batch"
```

### 4. Performance Monitoring
Monitor these metrics post-deployment:
- API response time for `/api/approvals/[id]/details`
- Database query count per approval request
- Cache hit/miss ratios
- Modal load times in browser

## Rollback Plan

If issues arise:
1. **Database**: Migration is additive - safe to keep indexes
2. **API**: Revert to original `calculateLeaveDeduction` loop
3. **Cache**: Disable by setting cache TTL to 0
4. **Client**: Revert SWR configuration to defaults

## Future Enhancements

### Phase 2 Optimizations
- **GraphQL batching** for multiple approval requests
- **WebSocket updates** for real-time approval status
- **Background preloading** of likely-to-be-approached requests
- **Analytics dashboard** for cache performance monitoring

### Monitoring Improvements
- **APM integration** for detailed performance tracking
- **Cache analytics** for hit ratio optimization
- **Database query analysis** for further optimization opportunities
- **User experience metrics** for modal load time tracking

## Success Metrics

### Technical Metrics
- **API response time**: <200ms (95th percentile)
- **Database queries**: <3 per approval request
- **Cache hit ratio**: >80% for approval details
- **Modal load time**: <500ms (95th percentile)

### Business Metrics
- **User satisfaction**: Reduced complaints about slow approvals
- **Approval efficiency**: Faster approval completion rates
- **System scalability**: Handle 2x concurrent approval requests
- **Resource utilization**: Reduced database load during peak hours
