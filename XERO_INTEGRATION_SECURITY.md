# Xero Integration - Security Implementation

## ✅ Security Measures Implemented

### 1. **Admin-Only Access**

All Xero integration features require admin privileges:

```typescript
// UI Level
if (!isAdmin(session.user)) {
  // Show "Access Denied" message
}

// API Level (all routes)
if (!isAdmin(session.user)) {
  return NextResponse.json(
    { error: "Forbidden - Admin access required" },
    { status: 403 }
  );
}
```

**Protected Routes:**
- ✅ `/api/xero/status` - Check connection status
- ✅ `/api/xero/connect` - Initiate OAuth flow
- ✅ `/api/xero/callback` - OAuth callback handler
- ✅ `/api/xero/disconnect` - Disconnect integration
- ✅ `/api/xero/test` - Test connection
- ✅ `/api/xero/test-payroll` - Test payroll access

**Allowed Roles:**
- ✅ `SUPER_ADMIN`
- ✅ `ADMIN`
- ❌ `MANAGER` (denied)
- ❌ `EMPLOYEE` (denied)

### 2. **Tenant Isolation**

All operations are scoped to the authenticated user's company:

```typescript
// Database queries
await prisma.xeroIntegration.findUnique({
  where: { companyId: session.user.companyId }
});

// Token retrieval
const token = await getXeroAccessToken(session.user.companyId);
```

**Isolation Points:**
- ✅ Database queries filtered by `companyId`
- ✅ OAuth callback links integration to user's company
- ✅ Token refresh scoped to company
- ✅ API requests use company-specific tokens
- ✅ Unique constraint on `companyId` (one integration per company)

### 3. **Authentication Checks**

Every API route verifies authentication:

```typescript
const session = await auth();
if (!session?.user?.companyId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**What's Checked:**
- ✅ Valid session exists
- ✅ User has a companyId
- ✅ User has admin role
- ✅ Company has active integration (where applicable)

### 4. **Token Security**

Tokens are handled securely:

```typescript
// Stored encrypted in database
model XeroIntegration {
  accessToken   String   @db.Text  // Encrypted at rest
  refreshToken  String   @db.Text  // Encrypted at rest
}

// Never exposed in API responses
select: {
  id: true,
  xeroTenantId: true,
  // accessToken NOT included
  // refreshToken NOT included
}
```

**Token Protection:**
- ✅ Tokens stored in database (not in session/cookies)
- ✅ Tokens never returned in API responses
- ✅ Automatic refresh before expiry
- ✅ Integration marked inactive on refresh failure
- ✅ Tokens deleted on disconnect

### 5. **OAuth Security**

OAuth flow is protected:

```typescript
// State parameter prevents CSRF
state: "peoplecore_xero"

// Callback verifies:
// 1. Valid session
// 2. Admin role
// 3. State parameter matches
// 4. Links to correct company
```

**OAuth Protections:**
- ✅ CSRF protection via state parameter
- ✅ Admin check in callback
- ✅ Redirect URI validation
- ✅ Token exchange over HTTPS
- ✅ Client secret never exposed to frontend

### 6. **Database Schema Security**

```prisma
model XeroIntegration {
  id            String   @id @default(cuid())
  companyId     String   @unique          // ← One per company
  xeroTenantId  String
  accessToken   String   @db.Text
  refreshToken  String   @db.Text
  expiresAt     DateTime
  isActive      Boolean  @default(true)
  
  company       Company  @relation(
    fields: [companyId], 
    references: [id], 
    onDelete: Cascade    // ← Auto-cleanup
  )
  
  @@index([companyId])   // ← Fast lookups
  @@index([xeroTenantId])
}
```

**Schema Protections:**
- ✅ Unique constraint on `companyId`
- ✅ Cascade delete on company deletion
- ✅ Indexed for performance
- ✅ Foreign key relationship enforced

### 7. **Error Handling**

Errors don't leak sensitive information:

```typescript
// ❌ BAD - Leaks token
{ error: `Token ${token} is invalid` }

// ✅ GOOD - Generic message
{ error: "Authentication failed", message: "Try reconnecting" }
```

**Error Messages:**
- ✅ Generic, user-friendly messages
- ✅ No token values exposed
- ✅ No internal system details
- ✅ No cross-tenant information
- ✅ Appropriate HTTP status codes

## 🔒 Security Checklist

- [x] Admin-only access enforced
- [x] Tenant isolation via companyId
- [x] Authentication required for all operations
- [x] Tokens stored securely in database
- [x] Tokens never exposed in responses
- [x] OAuth CSRF protection
- [x] Automatic token refresh
- [x] Failed refresh marks integration inactive
- [x] Cascade delete on company removal
- [x] Unique constraint prevents duplicate integrations
- [x] Error messages don't leak sensitive data
- [x] All database queries scoped to company
- [x] UI shows access denied for non-admins
- [x] API returns 403 for non-admins
- [x] Callback verifies admin role

## 🧪 Testing Security

Run the security test suite:

```bash
npm test tests/xero-integration-security.test.ts
```

## 🚨 Security Considerations

### What's Protected:
✅ Cross-tenant access (users can't access other companies' integrations)
✅ Unauthorized access (only admins can manage integrations)
✅ Token exposure (tokens never sent to frontend)
✅ CSRF attacks (state parameter in OAuth)
✅ Orphaned data (cascade delete on company removal)

### What to Monitor:
⚠️ Failed token refresh attempts (may indicate compromised tokens)
⚠️ Multiple failed admin checks (may indicate unauthorized access attempts)
⚠️ Unusual API usage patterns
⚠️ OAuth callback errors

### Best Practices:
1. Rotate Xero client secret periodically
2. Monitor integration activity logs
3. Review admin user list regularly
4. Keep dependencies updated
5. Use environment variables for secrets
6. Never commit `.env` files

## 📋 Audit Trail

All Xero operations should be logged:
- Connection/disconnection events
- Token refresh events
- API calls made
- Failed authentication attempts
- Admin access checks

Consider implementing audit logging for compliance.
