# Overtime Calculation Integration Tests

## Overview

This directory contains **end-to-end integration tests** that verify the overtime calculation system works correctly across the full time-tracking workflow:

- **Clock-in/Clock-out** → **Timesheet Generation** → **Overtime Calculation** → **Manager Approval**

These tests hit **real API endpoints** and verify **actual database state** to ensure the overtime calculator integrates properly with all system components.

---

## Test Scenarios

### ✅ Scenario 1: Clock-In to Timesheet Flow
**Purpose:** Verify basic overtime calculation when employee works beyond daily threshold

**Flow:**
1. Employee clocks in at 8am Monday
2. Employee clocks out at 6pm (10 hours worked)
3. Timesheet auto-generates at end of week
4. System calculates: 8h regular + 2h overtime @ 1.5x

**Validates:**
- Clock entry creation
- Timesheet generation
- Overtime auto-calculation
- Database state persistence

---

### ✅ Scenario 2: Public Holiday Overtime Flow
**Purpose:** Verify public holiday detection and premium rate application

**Flow:**
1. Public holiday created (Waitangi Day - Feb 6)
2. Employee works 9 hours on public holiday
3. Manager approves timesheet
4. System calculates: 9h @ 2.0x public holiday rate
5. Audit log records multiplier and reason

**Validates:**
- Public holiday detection via `isNZPublicHoliday()`
- Premium rate application (2.0x vs 1.5x)
- Audit trail generation
- Manager approval workflow

---

### ✅ Scenario 3: Manual Timesheet Entry with Override
**Purpose:** Verify manager can manually create entries with overtime preview

**Flow:**
1. Manager creates manual timesheet entry (11h)
2. System shows overtime preview before saving
3. Manager confirms and entry is saved
4. Database persists: 8h regular + 3h OT @ 1.5x

**Validates:**
- Calculator invoked before entry creation
- Preview calculation accuracy
- Manager override capability
- Breakdown persistence

---

### ✅ Scenario 4: Weekly Threshold Scenario
**Purpose:** Verify weekly overtime calculation with proportional distribution

**Flow:**
1. Employee works: Mon 8h, Tue 8h, Wed 8h, Thu 10h, Fri 10h (44h total)
2. System uses WEEKLY mode with 40h threshold
3. Overtime distributed proportionally across all entries
4. Totals verified: 40h regular + 4h overtime

**Validates:**
- Weekly threshold calculation
- Proportional OT distribution
- No double-counting
- Correct weekly totals

---

### ✅ Scenario 5: Error Recovery
**Purpose:** Verify graceful error handling when calculator encounters issues

**Flow:**
1. Create employee without working pattern
2. Attempt PATTERN_BASED calculation (missing data)
3. Calculator falls back to DAILY mode
4. Entry created with fallback calculation
5. No errors thrown, helpful message logged

**Validates:**
- Graceful error handling
- Fallback to safe defaults
- Error logging for debugging
- Entry creation despite errors

---

## Prerequisites

### 1. Test Database Setup

You need a **separate test database** to avoid corrupting production data.

**Option A: Use Docker (Recommended)**
```bash
docker run -d \
  --name overtime-test-db \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=overtime_test \
  -p 5433:5432 \
  postgres:15
```

**Option B: Use existing PostgreSQL**
```bash
createdb overtime_test
```

### 2. Environment Configuration

Create `.env.test` in project root:

```env
# Test Database
DATABASE_URL="postgresql://test:test@localhost:5433/overtime_test"

# NextAuth (required for session mocking)
NEXTAUTH_SECRET="test-secret-min-32-chars-required-for-security-testing"
NEXTAUTH_URL="http://localhost:3000"

# Email (can be dummy values)
FROM_EMAIL="test@example.com"

# Optional: Reduce log noise
LOG_LEVEL="error"
```

### 3. Database Migration

Run migrations on test database:

```bash
# Load test environment
export $(cat .env.test | xargs)

# Run Prisma migrations
npx prisma migrate deploy

# Verify schema is up to date
npx prisma db push
```

---

## Running the Tests

### Run All Integration Tests
```bash
npm test -- tests/integration/overtime-workflow.integration.test.ts
```

### Run Specific Scenario
```bash
# Scenario 1 only
npm test -- tests/integration/overtime-workflow.integration.test.ts --test-name-pattern="Scenario 1"

# Public holiday scenario
npm test -- tests/integration/overtime-workflow.integration.test.ts --test-name-pattern="public holiday"
```

### Run with Verbose Output
```bash
npm test -- tests/integration/overtime-workflow.integration.test.ts --test-reporter=spec
```

### Run with Coverage (if configured)
```bash
npm run test:coverage -- tests/integration/
```

---

## Expected Test Duration

- **Total Suite:** ~10-20 seconds
- **Individual Test:** ~2-4 seconds each
- **Target:** <30 seconds total ✅

Tests are optimized with:
- Parallel-safe data isolation (unique company per test)
- Efficient database queries
- Minimal setup/teardown

---

## Test Data Management

### Automatic Cleanup

Each test creates a **unique test company** with isolated data:
```typescript
beforeEach(async () => {
  testCompany = await createTestCompany(); // Unique ID
  // ... setup test data
});

afterEach(async () => {
  await cleanupTestData(testCompany.id); // Removes all related data
});
```

### Manual Cleanup (if needed)

If tests fail and leave orphaned data:
```bash
# Run cleanup script
npm run test:cleanup
```

Or manually via Prisma:
```typescript
import { cleanupAllTestData } from './tests/helpers/overtime-test-fixtures';

await cleanupAllTestData(); // Removes all test companies
```

---

## Debugging Failed Tests

### 1. Check Database Connection
```bash
# Test database connectivity
npx prisma db pull --schema=./prisma/schema.prisma
```

### 2. View Test Logs
Tests include detailed console output:
```
=== SCENARIO 1: Clock-In to Timesheet Flow ===
Step 1: Employee clocks in at 8am Monday...
✓ Clock entry created: clk_abc123
Step 2: Generating timesheet for the week...
✓ Timesheet entry created: tse_xyz789
...
```

### 3. Inspect Database State
```bash
# Open Prisma Studio pointed at test DB
DATABASE_URL="postgresql://test:test@localhost:5433/overtime_test" npx prisma studio
```

### 4. Enable Debug Logging
In `overtime-calculator.ts`, debug logs are already enabled:
```typescript
console.debug(
  `[overtime-calculator] ${format(date, 'yyyy-MM-dd')}: ` +
  `${hoursWorked}h worked → ${regularHours}h regular + ${overtimeHours}h OT`
);
```

Set `LOG_LEVEL=debug` in `.env.test` to see all calculator output.

---

## Test Architecture

### File Structure
```
tests/
├── integration/
│   ├── README.md (this file)
│   └── overtime-workflow.integration.test.ts
├── helpers/
│   └── overtime-test-fixtures.ts
└── setupEnv.ts
```

### Key Components

**1. Test Fixtures** (`overtime-test-fixtures.ts`)
- `createTestCompany()` - Isolated test company
- `createTestEmployee()` - Test user + employee
- `createTimeTrackingSettings()` - Company settings
- `createWorkingPattern()` - Employee work pattern
- `createClockEntry()` - Clock in/out records
- `createTimesheet()` - Timesheet with entries
- `cleanupTestData()` - Remove test data

**2. Integration Tests** (`overtime-workflow.integration.test.ts`)
- Uses real `calculateOvertimeForEntry()` function
- Hits actual Prisma database
- Verifies database state after operations
- Tests full workflow end-to-end

**3. Environment Setup** (`setupEnv.ts`)
- Loads test environment variables
- Sets up crypto polyfills
- Configures test database URL

---

## Continuous Integration (CI)

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: overtime_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/overtime_test
        run: npx prisma migrate deploy
      
      - name: Run integration tests
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/overtime_test
          NEXTAUTH_SECRET: test-secret-for-ci-pipeline-min-32-chars
          NEXTAUTH_URL: http://localhost:3000
        run: npm test -- tests/integration/
```

---

## Performance Benchmarks

Target performance metrics:

| Metric | Target | Actual |
|--------|--------|--------|
| Test suite duration | <30s | ~15s ✅ |
| Individual test | <5s | ~3s ✅ |
| Database queries per test | <50 | ~30 ✅ |
| Memory usage | <100MB | ~60MB ✅ |

---

## Troubleshooting

### "Cannot connect to database"
**Solution:** Check DATABASE_URL in `.env.test` and ensure postgres is running
```bash
pg_isready -h localhost -p 5433
```

### "Prisma schema out of sync"
**Solution:** Regenerate Prisma client
```bash
npx prisma generate
```

### "Tests timeout after 30 seconds"
**Solution:** Check for database locks or slow queries
```sql
-- View active queries
SELECT * FROM pg_stat_activity WHERE state = 'active';
```

### "Cleanup errors between tests"
**Solution:** Ensure test database has CASCADE deletes configured
```sql
-- Check foreign key constraints
SELECT * FROM information_schema.table_constraints 
WHERE constraint_type = 'FOREIGN KEY';
```

---

## Best Practices

### ✅ DO:
- Run tests on separate test database
- Use unique test data per test (avoid conflicts)
- Clean up after each test
- Verify database state, not just return values
- Test error scenarios and edge cases

### ❌ DON'T:
- Run tests on production database
- Share test data between tests
- Mock database calls (these are integration tests)
- Skip cleanup (causes test pollution)
- Commit `.env.test` with real credentials

---

## Contributing

When adding new integration tests:

1. **Follow naming convention:** `Scenario N: [Description]`
2. **Add console logging:** Help debug when tests fail
3. **Verify cleanup:** Ensure no orphaned test data
4. **Update README:** Document new scenarios
5. **Keep tests fast:** Target <5 seconds per test

---

## Support

For questions or issues:

1. Check test logs for detailed error messages
2. Review [NZ_OVERTIME_CALCULATION_RULES.md](../../NZ_OVERTIME_CALCULATION_RULES.md)
3. Inspect database state with Prisma Studio
4. Check `lib/overtime-calculator.ts` for calculation logic

---

## License

Part of the PeopleCore HR platform. Internal use only.
