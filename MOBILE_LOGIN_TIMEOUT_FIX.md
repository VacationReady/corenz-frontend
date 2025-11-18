# Mobile Login Timeout Fix

## Issue
Mobile app login was hanging indefinitely with the error:
```
ERROR ❌ Network error during login: [TypeError: Network request timed out]
```

The connectivity check was also timing out:
```
ERROR ⏱️ Connectivity check timed out while calling /api/auth/csrf
```

## Root Cause
The recent update (commit `ba45e532`) added better error handling and diagnostics to the mobile auth module, but **did not add timeout handling to the actual fetch requests**. 

While the `ApiConnectivityStatus` component had a 7-second timeout for its connectivity check, the main authentication functions (`signInWithCredentials`, `getSession`, `requestPasswordReset`) had no timeout configured, causing them to hang indefinitely when the network was slow or unresponsive.

## Solution
Added `AbortController` with 10-second timeouts to all fetch requests in `mobile/src/api/auth.ts`:

1. **`signInWithCredentials`** - Login request now times out after 10 seconds
2. **`getSession`** - Session validation now times out after 10 seconds  
3. **`requestPasswordReset`** - Password reset request now times out after 10 seconds

### Implementation Pattern
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

try {
  const response = await fetch(url, {
    // ... other options
    signal: controller.signal,
  });
  // ... handle response
} catch (error) {
  // ... handle error (AbortError will be thrown on timeout)
} finally {
  clearTimeout(timeoutId);
}
```

## Testing
To test the fix:
1. Start the mobile app
2. Attempt to login
3. If the backend is unreachable or slow, you should now see a timeout error after 10 seconds instead of hanging indefinitely
4. The error message will clearly indicate a timeout occurred

## Files Modified
- `mobile/src/api/auth.ts` - Added timeout handling to all fetch requests

## Related
- Previous diagnostic improvements: commits `42dce63e` and `ba45e532`
- Connectivity check component: `mobile/src/components/ApiConnectivityStatus.tsx` (already had timeout)
