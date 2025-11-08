# Why Integration Tests Are Skipped in CI

## Summary

The overtime integration tests are **automatically skipped in CI environments** (GitHub Actions, etc.) because they require a real PostgreSQL database with migrations and test data setup.

## Reason

Integration tests were designed for **local development and manual verification**:

1. **Database Dependency:** Tests require a running PostgreSQL instance with test schema
2. **Setup Complexity:** Need migrations, seed data, and proper environment configuration
3. **CI Resource Usage:** Database services add significant CI runtime and complexity
4. **Coverage Trade-off:** Unit tests already cover the core `calculatePureOvertime()` logic

## What Gets Tested in CI

✅ **47 Unit Tests** in `tests/lib/overtime-calculator.test.ts`
- All calculation modes (DAILY, WEEKLY, MONTHLY, PATTERN_BASED)
- Public holiday scenarios
- Edge cases and error handling
- Part-time/full-time scenarios
- Tier 2 overtime

✅ **13 Integration Tests** for public holiday detection (library-based, no DB)

✅ **All other existing tests** (API routes, forms, etc.)

## What Gets Skipped in CI

⏭️ **5 E2E Integration Tests** in `tests/integration/overtime-workflow.integration.test.ts`
- Clock-in to timesheet flow
- Public holiday overtime flow
- Manual entry with override
- Weekly threshold calculation
- Error recovery

## When to Run Integration Tests

### Run Locally Before:
- Deploying to production
- Major overtime calculation changes
- Database schema changes affecting time tracking
- Troubleshooting integration issues

### How to Run Locally:
```bash
# See tests/integration/SETUP.md for full setup instructions

# Quick start:
docker run -d --name overtime-test-db \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=overtime_test \
  -p 5433:5432 postgres:15

# Create .env.test with DATABASE_URL
# Run migrations
npx prisma migrate deploy

# Run tests
npm test -- tests/integration/overtime-workflow.integration.test.ts
```

## Detection Logic

Integration tests skip when ANY of these conditions are true:

1. `process.env.CI === 'true'` → GitHub Actions sets this automatically
2. `process.env.SKIP_INTEGRATION_TESTS === 'true'` → Manual override
3. `!process.env.DATABASE_URL?.includes('overtime_test')` → Test DB not configured

## Override (Not Recommended)

To force integration tests in CI:

```yaml
- name: Run tests including integration
  env:
    CI: false  # Override CI detection
    DATABASE_URL: postgresql://test:test@localhost:5432/overtime_test
  run: npm test
```

**Warning:** Adds ~2-3 minutes to CI runtime and requires PostgreSQL service configuration.

## Best Practice

**✅ Recommended Approach:**
- Run **unit tests** in CI (fast, no dependencies)
- Run **integration tests** locally before releases
- Use **staging environment** for full E2E verification

**❌ Not Recommended:**
- Running integration tests on every commit in CI
- Adding database services to CI for these specific tests
- Mocking database calls (defeats the purpose of integration tests)

## Related Files

- `tests/integration/overtime-workflow.integration.test.ts` - Integration test suite
- `tests/integration/README.md` - Full documentation
- `tests/integration/SETUP.md` - Local setup guide
- `tests/lib/overtime-calculator.test.ts` - Unit tests (run in CI)

---

**Need to verify overtime calculations work end-to-end?**  
Run the integration tests locally following `SETUP.md` instructions.
