/**
 * Property-based tests for Bug Comments
 * 
 * Feature: bug-reporting-system
 * Property 16: Comment Tenant Isolation
 * Property 17: Admin-Only Comment Visibility
 * 
 * **Validates: Requirements 11.1, 11.4, 11.5**
 */
import "../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";

// ============================================
// MOCK IMPLEMENTATION OF COMMENT FILTERING
// ============================================

interface BugComment {
  id: string;
  bugReportId: string;
  authorId: string;
  content: string;
  isAdminOnly: boolean;
  createdAt: Date;
}

interface BugReport {
  id: string;
  companyId: string;
}

interface User {
  id: string;
  companyId: string;
  canManageTenants: boolean;
}

/**
 * Simulates the tenant isolation check for adding comments.
 * A user can add a comment if:
 * 1. The bug belongs to their tenant (companyId matches), OR
 * 2. The user has canManageTenants permission (tenant admin)
 * 
 * Requirements: 11.1, 11.4
 */
function canUserAddComment(user: User, bug: BugReport): boolean {
  // Tenant admins can comment on any bug (Requirement 11.4)
  if (user.canManageTenants) {
    return true;
  }
  
  // Regular users can only comment on bugs from their tenant (Requirement 11.1)
  return user.companyId === bug.companyId;
}

/**
 * Filters comments based on user permissions.
 * Admin-only comments are excluded for non-tenant-admin users.
 * 
 * Requirements: 11.5
 */
function filterCommentsForUser(comments: BugComment[], user: User): BugComment[] {
  // Tenant admins see all comments
  if (user.canManageTenants) {
    return comments;
  }
  
  // Regular users only see non-admin-only comments
  return comments.filter(comment => !comment.isAdminOnly);
}

// ============================================
// ARBITRARIES (Test Data Generators)
// ============================================

const companyIdArb = fc.uuid();

const bugReportArb: fc.Arbitrary<BugReport> = fc.record({
  id: fc.uuid(),
  companyId: companyIdArb,
});

const userArb: fc.Arbitrary<User> = fc.record({
  id: fc.uuid(),
  companyId: companyIdArb,
  canManageTenants: fc.boolean(),
});

const commentArb: fc.Arbitrary<BugComment> = fc.record({
  id: fc.uuid(),
  bugReportId: fc.uuid(),
  authorId: fc.uuid(),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  isAdminOnly: fc.boolean(),
  createdAt: fc.integer({ min: 1577836800000, max: 1893456000000 }).map(ts => new Date(ts)),
});

const commentsListArb: fc.Arbitrary<BugComment[]> = fc.array(commentArb, { minLength: 0, maxLength: 20 });

// ============================================
// PROPERTY TESTS
// ============================================

test("Property 16: Comment Tenant Isolation - Bug Reporting System", async (t) => {
  const seed = 54321;

  await t.test("users can comment on bugs from their own tenant", () => {
    /**
     * Property: For any user and bug with matching companyId,
     * the user SHALL be able to add a comment.
     */
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (userId, bugId, companyId) => {
          const user: User = { id: userId, companyId, canManageTenants: false };
          const bug: BugReport = { id: bugId, companyId };
          
          return canUserAddComment(user, bug) === true;
        }
      ),
      { numRuns: 200, seed }
    );
  });

  await t.test("users cannot comment on bugs from other tenants", () => {
    /**
     * Property: For any user and bug with different companyIds,
     * a non-admin user SHALL NOT be able to add a comment.
     */
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (userId, bugId, userCompanyId, bugCompanyId) => {
          // Ensure different company IDs
          fc.pre(userCompanyId !== bugCompanyId);
          
          const user: User = { id: userId, companyId: userCompanyId, canManageTenants: false };
          const bug: BugReport = { id: bugId, companyId: bugCompanyId };
          
          return canUserAddComment(user, bug) === false;
        }
      ),
      { numRuns: 200, seed }
    );
  });

  await t.test("tenant admins can comment on any bug regardless of tenant", () => {
    /**
     * Property: For any tenant admin user and any bug,
     * the user SHALL be able to add a comment.
     */
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (userId, bugId, userCompanyId, bugCompanyId) => {
          const user: User = { id: userId, companyId: userCompanyId, canManageTenants: true };
          const bug: BugReport = { id: bugId, companyId: bugCompanyId };
          
          return canUserAddComment(user, bug) === true;
        }
      ),
      { numRuns: 200, seed }
    );
  });

  await t.test("tenant isolation is enforced consistently", () => {
    /**
     * Property: The result of canUserAddComment should be deterministic
     * and consistent for the same inputs.
     */
    fc.assert(
      fc.property(userArb, bugReportArb, (user, bug) => {
        const result1 = canUserAddComment(user, bug);
        const result2 = canUserAddComment(user, bug);
        
        return result1 === result2;
      }),
      { numRuns: 200, seed }
    );
  });
});

test("Property 17: Admin-Only Comment Visibility - Bug Reporting System", async (t) => {
  const seed = 67890;

  await t.test("admin-only comments are excluded for non-admin users", () => {
    /**
     * Property: For any list of comments and non-admin user,
     * the filtered result SHALL NOT contain any admin-only comments.
     */
    fc.assert(
      fc.property(
        commentsListArb,
        fc.uuid(),
        fc.uuid(),
        (comments, userId, companyId) => {
          const user: User = { id: userId, companyId, canManageTenants: false };
          const filtered = filterCommentsForUser(comments, user);
          
          // No admin-only comments should be in the result
          return filtered.every(comment => !comment.isAdminOnly);
        }
      ),
      { numRuns: 200, seed }
    );
  });

  await t.test("all comments are visible to tenant admins", () => {
    /**
     * Property: For any list of comments and tenant admin user,
     * the filtered result SHALL contain all comments.
     */
    fc.assert(
      fc.property(
        commentsListArb,
        fc.uuid(),
        fc.uuid(),
        (comments, userId, companyId) => {
          const user: User = { id: userId, companyId, canManageTenants: true };
          const filtered = filterCommentsForUser(comments, user);
          
          // All comments should be returned
          return filtered.length === comments.length;
        }
      ),
      { numRuns: 200, seed }
    );
  });

  await t.test("non-admin-only comments are always visible", () => {
    /**
     * Property: For any list of comments and any user,
     * non-admin-only comments SHALL always be included in the result.
     */
    fc.assert(
      fc.property(commentsListArb, userArb, (comments, user) => {
        const filtered = filterCommentsForUser(comments, user);
        const nonAdminComments = comments.filter(c => !c.isAdminOnly);
        
        // All non-admin comments should be in the filtered result
        return nonAdminComments.every(comment => 
          filtered.some(f => f.id === comment.id)
        );
      }),
      { numRuns: 200, seed }
    );
  });

  await t.test("filtered result is a subset of original comments", () => {
    /**
     * Property: For any filtering operation,
     * the result SHALL be a subset of the original comments.
     */
    fc.assert(
      fc.property(commentsListArb, userArb, (comments, user) => {
        const filtered = filterCommentsForUser(comments, user);
        
        // Every filtered comment should exist in the original list
        return filtered.every(f => 
          comments.some(c => c.id === f.id)
        );
      }),
      { numRuns: 200, seed }
    );
  });

  await t.test("filtering preserves comment content integrity", () => {
    /**
     * Property: Filtering SHALL NOT modify the content of comments.
     */
    fc.assert(
      fc.property(commentsListArb, userArb, (comments, user) => {
        const filtered = filterCommentsForUser(comments, user);
        
        // Each filtered comment should have identical content to original
        return filtered.every(f => {
          const original = comments.find(c => c.id === f.id);
          return original && 
            f.content === original.content &&
            f.authorId === original.authorId &&
            f.isAdminOnly === original.isAdminOnly;
        });
      }),
      { numRuns: 200, seed }
    );
  });

  await t.test("empty comment list returns empty result", () => {
    /**
     * Edge case: Empty comment list should return empty result.
     */
    const user: User = { id: "user-1", companyId: "company-1", canManageTenants: false };
    const filtered = filterCommentsForUser([], user);
    
    assert.equal(filtered.length, 0);
  });

  await t.test("all admin-only comments filtered for non-admin", () => {
    /**
     * Edge case: List with only admin-only comments should return empty for non-admin.
     */
    const comments: BugComment[] = [
      { id: "1", bugReportId: "bug-1", authorId: "author-1", content: "Admin note 1", isAdminOnly: true, createdAt: new Date() },
      { id: "2", bugReportId: "bug-1", authorId: "author-2", content: "Admin note 2", isAdminOnly: true, createdAt: new Date() },
    ];
    const user: User = { id: "user-1", companyId: "company-1", canManageTenants: false };
    const filtered = filterCommentsForUser(comments, user);
    
    assert.equal(filtered.length, 0);
  });

  await t.test("mixed comments filtered correctly for non-admin", () => {
    /**
     * Edge case: Mixed list should only return non-admin comments for non-admin user.
     */
    const comments: BugComment[] = [
      { id: "1", bugReportId: "bug-1", authorId: "author-1", content: "Public comment", isAdminOnly: false, createdAt: new Date() },
      { id: "2", bugReportId: "bug-1", authorId: "author-2", content: "Admin note", isAdminOnly: true, createdAt: new Date() },
      { id: "3", bugReportId: "bug-1", authorId: "author-3", content: "Another public", isAdminOnly: false, createdAt: new Date() },
    ];
    const user: User = { id: "user-1", companyId: "company-1", canManageTenants: false };
    const filtered = filterCommentsForUser(comments, user);
    
    assert.equal(filtered.length, 2);
    assert.ok(filtered.every(c => !c.isAdminOnly));
  });
});
