/**
 * Unit Tests for Profile Image Signed URL Batching
 * 
 * Tests the batching utility that reduces Supabase API calls
 * for profile image signed URL generation.
 */

import "../../setupEnv";
import test from "node:test";
import assert from "node:assert/strict";

// Mock Supabase admin client
let mockSupabaseResponses: Map<string, { signedUrl: string | null; error: any }> = new Map();
let supabaseCallCount = 0;

const mockSupabase = {
  storage: {
    from: (bucket: string) => ({
      createSignedUrl: async (path: string, expiresIn: number) => {
        supabaseCallCount += 1;

        const response = mockSupabaseResponses.get(path);
        if (response) {
          return {
            data: response.signedUrl ? { signedUrl: response.signedUrl } : null,
            error: response.error,
          };
        }
        return {
          data: { signedUrl: `https://example.com/signed/${path}?exp=${expiresIn}` },
          error: null,
        };
      },
    }),
  },
};

import {
  batchSignProfileUrls,
  createSignedUrlMap,
  batchSignProfileUrlsAsMap,
  getSignedProfileUrl,
  type ProfileSignRequest,
  __setSupabaseClientForTests,
  __clearProfileUrlCacheForTests,
} from "../../../app/lib/storage/signProfiles";

test("Profile Signed URL Batching", async (t) => {
  const run = async (name: string, fn: () => Promise<void>) => {
    await t.test(name, async () => {
      // Reset mocks before each test
      mockSupabaseResponses.clear();
      supabaseCallCount = 0;
      __setSupabaseClientForTests(mockSupabase);
      __clearProfileUrlCacheForTests();
      await fn();
    });
  };

  // ========================================
  // Basic Functionality Tests
  // ========================================

  await run("batchSignProfileUrls: returns empty array for empty input", async () => {
    const results = await batchSignProfileUrls([]);
    assert.deepEqual(results, []);
  });

  await run("batchSignProfileUrls: signs single profile URL", async () => {
    const requests: ProfileSignRequest[] = [
      { id: "user1", path: "profiles/user1.jpg" },
    ];

    const results = await batchSignProfileUrls(requests);

    assert.equal(results.length, 1);
    assert.equal(results[0].id, "user1");
    assert.ok(results[0].signedUrl);
    assert.ok(results[0].signedUrl!.includes("profiles/user1.jpg"));
  });

  await run("batchSignProfileUrls: signs multiple profile URLs", async () => {
    const requests: ProfileSignRequest[] = [
      { id: "user1", path: "profiles/user1.jpg" },
      { id: "user2", path: "profiles/user2.png" },
      { id: "user3", path: "profiles/user3.webp" },
    ];

    const results = await batchSignProfileUrls(requests);

    assert.equal(results.length, 3);
    assert.equal(results[0].id, "user1");
    assert.equal(results[1].id, "user2");
    assert.equal(results[2].id, "user3");
    assert.ok(results[0].signedUrl);
    assert.ok(results[1].signedUrl);
    assert.ok(results[2].signedUrl);
  });

  await run("batchSignProfileUrls: respects custom expiration time", async () => {
    const requests: ProfileSignRequest[] = [
      { id: "user1", path: "profiles/user1.jpg" },
    ];

    const customExpiry = 3600; // 1 hour
    const results = await batchSignProfileUrls(requests, customExpiry);

    assert.equal(results.length, 1);
    assert.ok(results[0].signedUrl);
    assert.ok(results[0].signedUrl!.includes(`exp=${customExpiry}`));
  });

  await run("batchSignProfileUrls: reuses cached URLs for repeated requests", async () => {
    const requests: ProfileSignRequest[] = [
      { id: "user1", path: "profiles/user1.jpg" },
    ];

    const firstResults = await batchSignProfileUrls(requests, 300);
    const firstUrl = firstResults[0].signedUrl;

    assert.ok(firstUrl, "First call should return a signed URL");

    const secondResults = await batchSignProfileUrls(requests, 300);
    const secondUrl = secondResults[0].signedUrl;

    assert.equal(secondUrl, firstUrl, "Second call should reuse cached URL");
    assert.equal(supabaseCallCount, 1, "Supabase should be called only once for cached path");
  });

  // ========================================
  // Error Handling Tests
  // ========================================

  await run("batchSignProfileUrls: handles Supabase errors gracefully", async () => {
    mockSupabaseResponses.set("profiles/error.jpg", {
      signedUrl: null,
      error: { message: "File not found" },
    });

    const requests: ProfileSignRequest[] = [
      { id: "user1", path: "profiles/user1.jpg" }, // Success
      { id: "user2", path: "profiles/error.jpg" }, // Error
      { id: "user3", path: "profiles/user3.jpg" }, // Success
    ];

    const results = await batchSignProfileUrls(requests);

    assert.equal(results.length, 3);
    assert.ok(results[0].signedUrl, "First URL should succeed");
    assert.equal(results[1].signedUrl, null, "Second URL should fail gracefully");
    assert.ok(results[2].signedUrl, "Third URL should succeed");
  });

  await run("batchSignProfileUrls: handles partial failures without blocking", async () => {
    mockSupabaseResponses.set("profiles/fail1.jpg", {
      signedUrl: null,
      error: { message: "Storage error" },
    });
    mockSupabaseResponses.set("profiles/fail2.jpg", {
      signedUrl: null,
      error: { message: "Permission denied" },
    });

    const requests: ProfileSignRequest[] = [
      { id: "user1", path: "profiles/success.jpg" },
      { id: "user2", path: "profiles/fail1.jpg" },
      { id: "user3", path: "profiles/fail2.jpg" },
      { id: "user4", path: "profiles/success2.jpg" },
    ];

    const results = await batchSignProfileUrls(requests);

    assert.equal(results.length, 4);
    assert.ok(results[0].signedUrl, "First should succeed");
    assert.equal(results[1].signedUrl, null, "Second should fail");
    assert.equal(results[2].signedUrl, null, "Third should fail");
    assert.ok(results[3].signedUrl, "Fourth should succeed");
  });

  // ========================================
  // Map Helper Tests
  // ========================================

  await run("createSignedUrlMap: creates lookup map from results", async () => {
    const results = [
      { id: "user1", signedUrl: "https://example.com/user1" },
      { id: "user2", signedUrl: "https://example.com/user2" },
      { id: "user3", signedUrl: null },
    ];

    const map = createSignedUrlMap(results);

    assert.equal(map.size, 3);
    assert.equal(map.get("user1"), "https://example.com/user1");
    assert.equal(map.get("user2"), "https://example.com/user2");
    assert.equal(map.get("user3"), null);
    assert.equal(map.get("nonexistent"), undefined);
  });

  await run("createSignedUrlMap: handles empty results", async () => {
    const map = createSignedUrlMap([]);
    assert.equal(map.size, 0);
  });

  await run("batchSignProfileUrlsAsMap: combines batch + map creation", async () => {
    const requests: ProfileSignRequest[] = [
      { id: "user1", path: "profiles/user1.jpg" },
      { id: "user2", path: "profiles/user2.jpg" },
    ];

    const map = await batchSignProfileUrlsAsMap(requests);

    assert.equal(map.size, 2);
    assert.ok(map.get("user1"));
    assert.ok(map.get("user2"));
    assert.ok(map.get("user1")!.includes("user1.jpg"));
    assert.ok(map.get("user2")!.includes("user2.jpg"));
  });

  // ========================================
  // Performance & Scalability Tests
  // ========================================

  await run("batchSignProfileUrls: handles large batches efficiently", async () => {
    const largeRequestSet: ProfileSignRequest[] = Array.from(
      { length: 100 },
      (_, i) => ({
        id: `user${i}`,
        path: `profiles/user${i}.jpg`,
      }),
    );

    const startTime = Date.now();
    const results = await batchSignProfileUrls(largeRequestSet);
    const duration = Date.now() - startTime;

    assert.equal(results.length, 100);
    assert.ok(duration < 5000, `Batch should complete quickly, took ${duration}ms`);

    // Verify all results have correct IDs
    results.forEach((result, index) => {
      assert.equal(result.id, `user${index}`);
    });
  });

  await run("batchSignProfileUrls: maintains order of requests", async () => {
    const requests: ProfileSignRequest[] = [
      { id: "user5", path: "profiles/user5.jpg" },
      { id: "user2", path: "profiles/user2.jpg" },
      { id: "user8", path: "profiles/user8.jpg" },
      { id: "user1", path: "profiles/user1.jpg" },
    ];

    const results = await batchSignProfileUrls(requests);

    assert.equal(results.length, 4);
    assert.equal(results[0].id, "user5");
    assert.equal(results[1].id, "user2");
    assert.equal(results[2].id, "user8");
    assert.equal(results[3].id, "user1");
  });

  // ========================================
  // Edge Cases
  // ========================================

  await run("batchSignProfileUrls: handles duplicate IDs", async () => {
    const requests: ProfileSignRequest[] = [
      { id: "user1", path: "profiles/user1-v1.jpg" },
      { id: "user1", path: "profiles/user1-v2.jpg" }, // Duplicate ID, different path
      { id: "user2", path: "profiles/user2.jpg" },
    ];

    const results = await batchSignProfileUrls(requests);

    assert.equal(results.length, 3);
    assert.equal(results[0].id, "user1");
    assert.equal(results[1].id, "user1");
    assert.equal(results[2].id, "user2");
    // Both user1 entries should have signed URLs (for their respective paths)
    assert.ok(results[0].signedUrl);
    assert.ok(results[1].signedUrl);
  });

  await run("batchSignProfileUrls: handles special characters in paths", async () => {
    const requests: ProfileSignRequest[] = [
      { id: "user1", path: "profiles/user name with spaces.jpg" },
      { id: "user2", path: "profiles/user-with-dashes.jpg" },
      { id: "user3", path: "profiles/user_with_underscores.jpg" },
    ];

    const results = await batchSignProfileUrls(requests);

    assert.equal(results.length, 3);
    results.forEach((result) => {
      assert.ok(result.signedUrl, `URL for ${result.id} should be signed`);
    });
  });

  await run("getSignedProfileUrl: uses batching helper for single path", async () => {
    const url = await getSignedProfileUrl("profiles/single-user.jpg", 600);

    assert.ok(url);
    assert.ok(url!.includes("profiles/single-user.jpg"));
    assert.equal(supabaseCallCount, 1, "Single helper should issue exactly one Supabase call");
  });

  // ========================================
  // Integration Scenario Tests
  // ========================================

  await run("Integration: typical employee listing scenario", async () => {
    // Simulate fetching 20 employees, 15 have profile images
    const requests: ProfileSignRequest[] = Array.from(
      { length: 15 },
      (_, i) => ({
        id: `emp${i}`,
        path: `profiles/employee${i}.jpg`,
      }),
    );

    const map = await batchSignProfileUrlsAsMap(requests);

    // Verify we can efficiently lookup URLs
    assert.equal(map.size, 15);
    assert.ok(map.get("emp0"));
    assert.ok(map.get("emp7"));
    assert.ok(map.get("emp14"));
    assert.equal(map.get("emp15"), undefined); // Not in batch

    // Simulate mapping to employee records
    const employees = Array.from({ length: 20 }, (_, i) => ({
      id: `emp${i}`,
      name: `Employee ${i}`,
      hasProfileImage: i < 15,
    }));

    const employeesWithUrls = employees.map((emp) => ({
      ...emp,
      profileUrl: emp.hasProfileImage ? map.get(emp.id) ?? null : null,
    }));

    // Verify correct mapping
    assert.equal(employeesWithUrls.length, 20);
    assert.ok(employeesWithUrls[0].profileUrl); // Has image
    assert.ok(employeesWithUrls[14].profileUrl); // Has image
    assert.equal(employeesWithUrls[15].profileUrl, null); // No image
    assert.equal(employeesWithUrls[19].profileUrl, null); // No image
  });

  await run("Integration: handles mixed success/failure in real scenario", async () => {
    // Simulate some profile images failing to load
    mockSupabaseResponses.set("profiles/deleted.jpg", {
      signedUrl: null,
      error: { message: "File not found" },
    });
    mockSupabaseResponses.set("profiles/corrupted.jpg", {
      signedUrl: null,
      error: { message: "Invalid file" },
    });

    const requests: ProfileSignRequest[] = [
      { id: "emp1", path: "profiles/valid1.jpg" },
      { id: "emp2", path: "profiles/deleted.jpg" },
      { id: "emp3", path: "profiles/valid2.jpg" },
      { id: "emp4", path: "profiles/corrupted.jpg" },
      { id: "emp5", path: "profiles/valid3.jpg" },
    ];

    const map = await batchSignProfileUrlsAsMap(requests);

    // Verify successful URLs are present
    assert.ok(map.get("emp1"));
    assert.ok(map.get("emp3"));
    assert.ok(map.get("emp5"));

    // Verify failed URLs are null (not undefined)
    assert.equal(map.get("emp2"), null);
    assert.equal(map.get("emp4"), null);

    // Frontend can handle nulls gracefully
    const displayUrl = (empId: string) => map.get(empId) ?? "/default-avatar.png";
    assert.ok(displayUrl("emp1").startsWith("https://"));
    assert.equal(displayUrl("emp2"), "/default-avatar.png");
    assert.ok(displayUrl("emp3").startsWith("https://"));
  });
});
