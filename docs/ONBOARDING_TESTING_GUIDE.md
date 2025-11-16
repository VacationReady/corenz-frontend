# Onboarding System Testing Guide

This guide covers the comprehensive test suite for the onboarding system, including authentication, tenant isolation, label validation, and renderer compatibility.

---

## Test Categories

### 1. Unit Tests
**Location**: `tests/unit/`  
**Purpose**: Test individual functions and utilities in isolation

#### Label Validation Tests
```bash
# Run all label validation unit tests
npm test -- tests/unit/label-validation.test.ts

# Watch mode for development
npm test -- tests/unit/label-validation.test.ts --watch
```

**Coverage**:
- Duplicate label detection (case-insensitive)
- Length validation (min 3, max 80 characters)
- Suggestion generation
- Localization (English, Te Reo Māori)
- Edge cases (whitespace, empty values, undefined IDs)

---

### 2. API Integration Tests
**Location**: `tests/api/`  
**Purpose**: Test API endpoints with authentication and authorization

#### Authentication & Authorization Tests
```bash
# Run authentication tests for instances endpoint
npm test -- tests/api/onboarding-instances-auth.test.ts
```

**Coverage**:
- ✅ **401 Unauthorized**: No session or missing `companyId`
- ✅ **403 Forbidden**: Cross-tenant access attempts
- ✅ **404 Not Found**: Non-existent employees
- ✅ **200 Success**: Valid tenant-scoped requests

**Example Test Scenarios**:
```typescript
// Test 1: Unauthenticated request
test("returns 401 for unauthenticated requests", async () => {
  mockSession = null;
  const res = await GET(req, { params: { employeeId: "emp1" } });
  assert.equal(res.status, 401);
});

// Test 2: Cross-tenant access
test("returns 403 for cross-tenant access attempt", async () => {
  mockSession = { user: { companyId: "company1" } };
  prisma.employee.findUnique = async () => ({ companyId: "company2" });
  const res = await GET(req, { params: { employeeId: "emp1" } });
  assert.equal(res.status, 403);
});
```

---

### 3. Integration Tests
**Location**: `tests/integration/`  
**Purpose**: Test complete workflows with database and renderer

#### Step Type Mapping & Renderer Tests
```bash
# Run renderer integration tests
npm test -- tests/integration/onboarding-payroll-setup-renderer.test.ts
```

**Coverage**:
- ✅ **PAYROLL_SETUP** → `payroll-setup` mapping
- ✅ **EQUIPMENT_CHECKLIST** → `equipment-checklist` mapping
- ✅ **BENEFITS_ENROLLMENT** → `benefits-enrollment` mapping
- ✅ All 18 step types validated for round-trip conversion
- ✅ Metadata normalization for renderer compatibility

**Key Tests**:
```typescript
// Validates bidirectional mapping
test("Integration: Full step type mapping round-trip", () => {
  const stepTypes = ["PAYROLL_SETUP", "EQUIPMENT_CHECKLIST", ...];
  
  for (const dbType of stepTypes) {
    const uiType = mapDbStepTypeToUi(dbType);
    const backToDb = mapUiStepTypeToDb(uiType);
    assert.equal(backToDb, dbType);
  }
});
```

---

### 4. End-to-End (E2E) Tests
**Location**: `tests/e2e/`  
**Purpose**: Test complete user workflows in browser

#### Multi-Tenant Cypress Tests
```bash
# Run E2E tests (requires Cypress installed)
npm run cypress:open

# Or run headless
npm run cypress:run -- --spec "tests/e2e/onboarding-multi-tenant.cy.ts"
```

**Coverage**:
- Template builder label validation UI
- Cross-tenant isolation (API & UI)
- Complete onboarding workflow (multiple step types)
- Audit trail verification
- Localization switching

**Example Test**:
```typescript
it("prevents duplicate step titles within a template", () => {
  cy.visit("/onboarding/templates/new");
  cy.get('[data-testid="add-step"]').click();
  cy.get('[data-testid="step-title-0"]').type("Welcome Session");
  
  // Add second step with same title
  cy.get('[data-testid="add-step"]').click();
  cy.get('[data-testid="step-title-1"]').type("Welcome Session");
  
  // Should show error and suggestion
  cy.get('[data-testid="step-title-1"]')
    .parent()
    .should("contain", "already in use");
  cy.get('[data-testid="suggestion-button-1"]')
    .should("contain", "Welcome Session 2");
});
```

---

## Running All Tests

### Full Test Suite
```bash
# Run all tests (unit + integration + API)
npm test

# With coverage report
npm run test:coverage

# Coverage threshold: 80% minimum, 95% for security-critical paths
```

### Continuous Integration
```bash
# CI command (gates merges)
npm run test:ci

# Runs:
# 1. Unit tests
# 2. API integration tests
# 3. E2E tests (headless)
# 4. Coverage report
# 5. Lint checks
```

---

## Test Database Setup

### Prerequisites
```bash
# 1. Create test database
createdb corenz_test

# 2. Run migrations
DATABASE_URL="postgresql://user:pass@localhost:5432/corenz_test" \
  npx prisma migrate deploy

# 3. Seed test data
npm run db:seed:test
```

### Mocking Strategy

**Prisma Mocking** (Unit & API tests):
```typescript
import Module from "module";

const originalLoad = (Module as any)._load;
(Module as any)._load = function (request: string, parent: any, isMain: boolean) {
  if (request === "@/lib/prisma") {
    return { prisma: mockPrismaClient };
  }
  return originalLoad(request, parent, isMain);
};
```

**NextAuth Mocking**:
```typescript
if (request === "next-auth") {
  return {
    getServerSession: async () => mockSession,
  };
}
```

---

## Security Testing Checklist

Run before every production deployment:

- [ ] **Authentication Tests**
  - All API endpoints return 401 without session
  - Invalid sessions rejected

- [ ] **Authorization Tests**
  - Cross-tenant access returns 403
  - Employee verification works correctly
  - Permission checks enforced

- [ ] **Input Validation Tests**
  - Label validation prevents XSS
  - SQL injection attempts blocked
  - Max length limits enforced

- [ ] **Audit Trail Tests**
  - All mutations logged to audit table
  - Logs include before/after values
  - Tenant scope enforced in audit logs

---

## Performance Testing

### Load Tests (Optional)
```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io

# Run load test
k6 run tests/load/onboarding-instances.js

# Target: 100 req/s with p95 < 200ms
```

**Example Load Test**:
```javascript
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,
  duration: '30s',
};

export default function () {
  const res = http.get('http://localhost:3000/api/onboarding/instances/emp1', {
    headers: { Cookie: 'session=...' },
  });
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

---

## Debugging Failed Tests

### Common Issues

**1. Session Not Mocked Properly**
```typescript
// ❌ Wrong
mockSession = {};

// ✅ Correct
mockSession = {
  user: {
    id: "user1",
    companyId: "company1",
    email: "test@example.com",
  },
};
```

**2. Prisma Mock Not Returning Correct Shape**
```typescript
// ❌ Wrong
prisma.employee.findUnique = async () => ({ id: "emp1" });

// ✅ Correct (includes companyId)
prisma.employee.findUnique = async () => ({
  id: "emp1",
  companyId: "company1",
});
```

**3. Test Data Isolation**
```bash
# Reset test database between runs
npm run db:reset:test
```

---

## Coverage Reports

### Generating Coverage
```bash
# Generate HTML coverage report
npm run test:coverage

# Open report
open coverage/index.html
```

### Coverage Targets
| Component | Target | Critical |
|-----------|--------|----------|
| `mapStepType.ts` | 100% | Yes |
| `label-validation.ts` | 95% | Yes |
| `instances/[employeeId]/route.ts` | 95% | Yes |
| `templates/route.ts` | 90% | Yes |
| UI Components | 80% | No |

---

## Adding New Tests

### Template for API Test
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../../app/api/your-endpoint/route";
import { NextRequest } from "next/server";

test("describes what is being tested", async () => {
  // Setup
  mockSession = { user: { companyId: "company1" } };
  
  // Execute
  const req = new NextRequest("http://localhost/api/endpoint");
  const res = await GET(req, { params: {} });
  const data = await res.json();
  
  // Assert
  assert.equal(res.status, 200);
  assert.ok(data.someProperty);
});
```

### Template for Unit Test
```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { yourFunction } from "../../lib/module";

test("yourFunction - handles edge case correctly", () => {
  const result = yourFunction(input);
  assert.equal(result, expectedOutput);
});
```

---

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: Onboarding Tests

on:
  pull_request:
    paths:
      - 'app/api/onboarding/**'
      - 'lib/onboarding/**'
      - 'tests/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
      
      - name: Run tests
        run: npm run test:ci
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## Resources

- **Security Threat Model**: `docs/ONBOARDING_SECURITY_THREAT_MODEL.md`
- **API Documentation**: `docs/ONBOARDING_API.md`
- **Developer Guide**: `ONBOARDING_METADATA_DEVELOPER_GUIDE.md`

---

## Support

For test failures or questions:
- **Slack**: #onboarding-dev
- **Email**: dev-team@corenz.com
- **Issues**: GitHub Issues with `test` label

---

**Last Updated**: 2024  
**Maintained By**: Development Team  
**Review Cadence**: Quarterly
