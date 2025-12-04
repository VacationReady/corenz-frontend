# Migration Guide: localStorage → httpOnly Cookies

## Overview

This guide explains how to migrate from localStorage-based authentication to httpOnly cookies for improved security on web platforms.

## Why Migrate?

### Security Benefits
- ✅ **XSS Protection**: httpOnly cookies cannot be accessed by JavaScript, preventing XSS attacks from stealing tokens
- ✅ **Automatic Cookie Management**: Browser handles cookie transmission automatically
- ✅ **CSRF Protection**: SameSite cookie attribute provides built-in CSRF protection
- ✅ **Industry Standard**: Recommended by OWASP for web applications

### Trade-offs
- ⚠️ **Platform-Specific**: Requires separate implementation for web vs mobile
- ⚠️ **CORS Complexity**: Requires proper CORS configuration with credentials
- ⚠️ **Testing**: Slightly more complex to test (cookies vs localStorage)

## Implementation Status

### ✅ Completed
1. **Web Login Endpoint** (`/api/auth/web-login`)
   - Uses httpOnly cookies
   - Secure, SameSite protection
   - Rate limiting included

2. **Web Auth Module** (`mobile/src/api/auth-web.ts`)
   - Platform-specific authentication
   - Automatic cookie handling
   - Credentials: "include" for cookie transmission

3. **Login Screen Update**
   - Automatically detects platform
   - Uses web auth on web, mobile auth on native

### 🔄 Migration Steps

#### Step 1: Update Login Screen (Already Done)
The login screen now automatically uses the correct auth method based on platform.

#### Step 2: Update API Client for Web
The API client needs to send cookies automatically on web:

```typescript
// mobile/src/api/client.ts
export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers ?? {});

  if (shouldAttachJsonHeader(init)) {
    headers.set('Content-Type', 'application/json');
  }

  // On web, cookies are sent automatically with credentials: "include"
  // On mobile, we manually attach the token as a cookie header
  if (Platform.OS === 'web') {
    // Cookies sent automatically by browser
    return fetch(resolveUrl(path), {
      ...init,
      headers,
      credentials: 'include', // Important: Include cookies
    });
  } else {
    // Mobile: Manual cookie header
    const sessionToken = await storage.getItem(SESSION_TOKEN_KEY);
    if (sessionToken) {
      const cookie = `${SESSION_COOKIE_NAME}=${sessionToken}`;
      const existingCookie = headers.get('Cookie');
      headers.set('Cookie', existingCookie ? `${existingCookie}; ${cookie}` : cookie);
    }

    return fetch(resolveUrl(path), {
      ...init,
      headers,
      credentials: 'omit',
    });
  }
}
```

#### Step 3: Update Session Management
Update `getSession()` to use the appropriate method:

```typescript
// mobile/src/api/auth.ts
export async function getSession() {
  if (Platform.OS === 'web') {
    // Use web auth module
    return getSessionWeb();
  }
  // ... existing mobile implementation
}
```

#### Step 4: Remove localStorage Fallback
Once web auth is fully migrated, remove localStorage from the storage wrapper:

```typescript
// mobile/src/api/auth.ts
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === "web") {
      // No longer needed - cookies handled by browser
      return null;
    }
    return SecureStore.getItemAsync(key);
  },
  // ... similar for setItem/deleteItem
};
```

## Testing Checklist

- [ ] Web login works with httpOnly cookies
- [ ] Mobile login still works with SecureStore
- [ ] Session persists across page refreshes (web)
- [ ] Logout clears cookies properly
- [ ] CORS allows credentials from correct origin
- [ ] Token refresh works on both platforms
- [ ] API requests include cookies automatically (web)

## CORS Configuration

Ensure your CORS settings allow credentials:

```javascript
// next.config.js
Access-Control-Allow-Credentials: "true"
Access-Control-Allow-Origin: process.env.MOBILE_APP_ORIGIN // NOT "*"
```

**Important**: When using credentials, `Access-Control-Allow-Origin` cannot be `"*"`. It must be a specific origin.

## Rollback Plan

If issues arise, you can temporarily revert by:

1. Update LoginScreen to always use `signInWithCredentials` from `auth.ts`
2. Keep localStorage fallback in storage wrapper
3. Both methods will work during transition period

## Timeline Recommendation

### Phase 1: Parallel Implementation (Current)
- ✅ Web login endpoint created
- ✅ Web auth module created
- ✅ Login screen detects platform
- ⏳ API client needs update for web

### Phase 2: Full Migration (Recommended: 1-2 weeks)
- Update API client to use cookies on web
- Update all session checks to use web auth
- Remove localStorage fallback
- Test thoroughly

### Phase 3: Cleanup (Recommended: 1 month after Phase 2)
- Remove unused localStorage code
- Update documentation
- Consider deprecating mobile-login endpoint (or keep for API clients)

## Security Comparison

| Feature | localStorage | httpOnly Cookies |
|---------|-------------|------------------|
| XSS Protection | ❌ Accessible to JS | ✅ Not accessible to JS |
| CSRF Protection | ⚠️ Manual implementation | ✅ SameSite attribute |
| Automatic Transmission | ❌ Manual header | ✅ Browser handles |
| Size Limit | ~5-10MB | ~4KB per cookie |
| Mobile Support | ✅ Works | ⚠️ Requires separate endpoint |

## Conclusion

**Recommendation**: Migrate to httpOnly cookies for web platforms. The security benefits outweigh the implementation complexity, especially for production applications handling sensitive data.

The hybrid approach (httpOnly cookies for web, SecureStore for mobile) provides the best security for each platform while maintaining compatibility.















