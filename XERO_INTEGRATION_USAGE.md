# Xero Integration - Developer Guide

## Overview

The Xero integration provides automatic token management and a simple API for making authenticated requests to Xero.

## Features Implemented

✅ OAuth 2.0 connection flow
✅ Automatic token refresh (tokens auto-refresh 5 minutes before expiry)
✅ Secure token storage in database
✅ Disconnect functionality
✅ Test connection endpoint

## Using the Integration in Your Code

### 1. Making API Requests to Xero

Use the `xeroApiRequest` helper function:

```typescript
import { xeroApiRequest } from "@/lib/xero";

// Example: Fetch contacts from Xero
const response = await xeroApiRequest(companyId, "/Contacts");
const data = await response.json();
```

### 2. Getting a Valid Access Token

The library automatically handles token refresh:

```typescript
import { getXeroAccessToken } from "@/lib/xero";

const accessToken = await getXeroAccessToken(companyId);
if (!accessToken) {
  // Integration not connected or token refresh failed
  throw new Error("Xero not connected");
}
```

### 3. Getting the Xero Tenant ID

```typescript
import { getXeroTenantId } from "@/lib/xero";

const tenantId = await getXeroTenantId(companyId);
```

### 4. Disconnecting

```typescript
import { disconnectXero } from "@/lib/xero";

await disconnectXero(companyId);
```

## API Endpoints

### Connect to Xero
- **GET** `/api/xero/connect`
- Redirects to Xero OAuth flow

### OAuth Callback
- **GET** `/api/xero/callback`
- Handles OAuth response and stores tokens

### Check Status
- **GET** `/api/xero/status`
- Returns connection status and metadata

### Disconnect
- **POST** `/api/xero/disconnect`
- Revokes access and deletes stored credentials

### Test Connection
- **GET** `/api/xero/test`
- Tests the connection and token refresh
- Returns organization details from Xero

## Token Refresh Logic

Tokens are automatically refreshed when:
- They are expired
- They will expire within 5 minutes
- Any API request is made using `xeroApiRequest()`

If token refresh fails:
- The integration is marked as `isActive: false`
- User needs to reconnect via the UI

## Database Schema

```prisma
model XeroIntegration {
  id            String   @id @default(cuid())
  companyId     String   @unique
  xeroTenantId  String
  accessToken   String   @db.Text
  refreshToken  String   @db.Text
  expiresAt     DateTime
  tokenType     String   @default("Bearer")
  scopes        String[]
  connectedAt   DateTime @default(now())
  lastSyncAt    DateTime?
  isActive      Boolean  @default(true)
  
  company       Company  @relation(fields: [companyId], references: [id], onDelete: Cascade)
}
```

## Example: Syncing Employees to Xero

```typescript
import { xeroApiRequest } from "@/lib/xero";
import { prisma } from "@/lib/prisma";

export async function syncEmployeesToXero(companyId: string) {
  // Fetch employees from your database
  const employees = await prisma.employee.findMany({
    where: { companyId },
  });

  // Transform to Xero format
  const xeroContacts = employees.map(emp => ({
    Name: `${emp.firstName} ${emp.lastName}`,
    EmailAddress: emp.email,
    ContactStatus: "ACTIVE",
  }));

  // Send to Xero
  const response = await xeroApiRequest(companyId, "/Contacts", {
    method: "POST",
    body: JSON.stringify({ Contacts: xeroContacts }),
  });

  if (!response.ok) {
    throw new Error("Failed to sync employees");
  }

  return await response.json();
}
```

## Testing the Integration

1. **Connect**: Go to Settings > System Settings > Xero Integration
2. **Click "Connect to Xero"**: Authorize the app
3. **Test Connection**: Click "Test Connection" button
4. **Check Logs**: Look for "Connection successful!" message

## Troubleshooting

### "No valid Xero access token available"
- Integration not connected
- Token refresh failed
- User needs to reconnect

### "Failed to refresh token"
- Refresh token expired (90 days)
- Client secret changed
- User needs to reconnect

### Token refresh fails repeatedly
- Check `XERO_CLIENT_SECRET` is correct
- Verify the integration is marked `isActive: true`
- Check Xero app hasn't been deleted

## Security Notes

- Tokens are stored encrypted in the database
- Never expose tokens in API responses
- Always use `xeroApiRequest()` helper for API calls
- Tokens auto-refresh before expiry
- Failed refreshes mark integration as inactive

## Next Steps

To extend the integration:

1. **Add sync endpoints** for specific data types
2. **Create webhooks** to receive Xero events
3. **Build UI** for viewing synced data
4. **Add scheduling** for automatic syncs
5. **Apply for payroll access** to sync payroll data
