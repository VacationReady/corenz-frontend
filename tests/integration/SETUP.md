# Integration Tests - Quick Setup Guide

## One-Time Setup

### Step 1: Create Test Database

**Option A: Docker (Recommended)**
```bash
docker run -d \
  --name overtime-test-db \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -e POSTGRES_DB=overtime_test \
  -p 5433:5432 \
  postgres:15
```

**Option B: Local PostgreSQL**
```bash
createdb overtime_test
```

### Step 2: Create `.env.test` File

Create a new file `.env.test` in the project root:

```env
# Test Database (use port 5433 if using Docker, 5432 if local)
DATABASE_URL="postgresql://test:test@localhost:5433/overtime_test"

# NextAuth Configuration
NEXTAUTH_SECRET="test-secret-min-32-chars-required-for-security-testing"
NEXTAUTH_URL="http://localhost:3000"

# Email Configuration (dummy values OK)
FROM_EMAIL="test@example.com"

# Reduce log noise during tests
LOG_LEVEL="error"
NODE_ENV="test"
```

### Step 3: Run Migrations

```bash
# Load test environment
export $(cat .env.test | xargs)

# Run migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

## Running Tests

### Run All Integration Tests
```bash
npm test -- tests/integration/overtime-workflow.integration.test.ts
```

### Run Specific Test
```bash
npm test -- tests/integration/overtime-workflow.integration.test.ts --test-name-pattern="Scenario 1"
```

## Verification

After setup, verify everything works:

```bash
# Test database connection
DATABASE_URL="postgresql://test:test@localhost:5433/overtime_test" npx prisma db pull

# Run a single quick test
npm test -- tests/integration/overtime-workflow.integration.test.ts --test-name-pattern="Scenario 1"
```

You should see:
```
=== SCENARIO 1: Clock-In to Timesheet Flow ===
Step 1: Employee clocks in at 8am Monday...
✓ Clock entry created: clk_abc123
...
=== SCENARIO 1 PASSED ===
```

## Cleanup

If you need to reset the test database:

```bash
# Drop and recreate (Docker)
docker exec overtime-test-db psql -U test -c "DROP DATABASE IF EXISTS overtime_test;"
docker exec overtime-test-db psql -U test -c "CREATE DATABASE overtime_test;"

# Re-run migrations
npx prisma migrate deploy
```

## Troubleshooting

**"Cannot connect to database"**
- Check Docker container is running: `docker ps | grep overtime-test-db`
- Check PostgreSQL is running: `pg_isready -h localhost -p 5433`

**"Prisma schema out of sync"**
- Run: `npx prisma generate`
- Then: `npx prisma migrate deploy`

**Tests hang or timeout**
- Check for database locks: Open new terminal and run `docker logs overtime-test-db`
- Restart database: `docker restart overtime-test-db`
