# Xero Integration Setup Guide

## Prerequisites

1. A Xero account with appropriate permissions
2. Access to the Xero Developer Portal

## Step 1: Create a Xero App

1. Go to https://developer.xero.com/app/manage
2. Click **"New app"**
3. Choose **"Web app"**
4. Fill in the required details:
   - **App name**: PeopleCore HRIS
   - **Company or application URL**: Your application URL
   - **OAuth 2.0 redirect URI**: 
     - Local: `http://localhost:3000/api/integrations/xero/callback`
     - Production: `https://yourdomain.com/api/integrations/xero/callback`

## Step 2: Configure Redirect URI

In your Xero app settings, set the **OAuth 2.0 redirect URI** to:
- Local: `http://localhost:3000/api/xero/callback`
- Production: `https://yourdomain.com/api/xero/callback`

This must match exactly (including http/https and trailing slashes).

After creating the app, you'll receive:
- **Client ID**: Copy this value
- **Client Secret**: Generate and copy this value (keep it secure!)

## Step 3: Get Your Credentials

After creating the app, you'll receive:
- **Client ID**: Copy this value
- **Client Secret**: Generate and copy this value (keep it secure!)

## Step 4: Configure Environment Variables

Add these to your `.env` file:

```env
XERO_CLIENT_ID=your_client_id_here
XERO_CLIENT_SECRET=your_client_secret_here
XERO_REDIRECT_URI=http://localhost:3000/api/xero/callback
```

For production, update `XERO_REDIRECT_URI` to your production domain.

## Step 5: Configure Scopes

The integration requests these scopes:
- `openid` - Basic authentication
- `profile` - User profile information
- `email` - User email address
- `offline_access` - Refresh token for long-term access
- `accounting.settings` - Access accounting settings
- `payroll.employees` - Read/write employee data
- `payroll.payruns` - Read/write pay run data
- `payroll.payitems` - Read/write pay items

Make sure your Xero app has these scopes enabled.

## Step 6: Test the Connection

1. Navigate to **Settings > System Settings > Xero Integration**
2. Click **"Connect to Xero"**
3. Authorize the app in Xero
4. You should be redirected back with a success message

## Troubleshooting

### Error: "unauthorized_client"
- **Cause**: Client ID is incorrect or redirect URI doesn't match
- **Solution**: 
  - Verify `XERO_CLIENT_ID` matches your Xero app
  - Ensure `XERO_REDIRECT_URI` exactly matches what's configured in Xero (including http/https)

### Error: "invalid_scope"
- **Cause**: Requested scopes aren't enabled in your Xero app
- **Solution**: Go to your Xero app settings and enable all required scopes

### Error: "access_denied"
- **Cause**: User declined authorization or doesn't have permissions
- **Solution**: Ensure the Xero user has appropriate permissions for payroll access

## Next Steps

After successful connection, you'll need to:

1. **Store tokens securely**: Implement token storage in your database
2. **Handle token refresh**: Implement automatic token refresh using the refresh token
3. **Sync employee data**: Create endpoints to sync employees between PeopleCore and Xero
4. **Sync payroll data**: Implement payroll data synchronization
5. **Error handling**: Add robust error handling for API failures

## Database Schema (Recommended)

```prisma
model XeroIntegration {
  id            String   @id @default(cuid())
  tenantId      String   @unique
  xeroTenantId  String
  accessToken   String   @db.Text
  refreshToken  String   @db.Text
  expiresAt     DateTime
  tokenType     String
  scopes        String[]
  connectedAt   DateTime @default(now())
  lastSyncAt    DateTime?
  isActive      Boolean  @default(true)
  
  tenant        Tenant   @relation(fields: [tenantId], references: [id])
  
  @@index([tenantId])
  @@index([xeroTenantId])
}
```

## API Endpoints to Implement

- `POST /api/integrations/xero/sync/employees` - Sync employees
- `POST /api/integrations/xero/sync/payroll` - Sync payroll data
- `GET /api/integrations/xero/status` - Check connection status
- `POST /api/integrations/xero/disconnect` - Disconnect integration
- `POST /api/integrations/xero/refresh` - Manually refresh token

## Resources

- [Xero API Documentation](https://developer.xero.com/documentation/)
- [Xero OAuth 2.0 Guide](https://developer.xero.com/documentation/guides/oauth2/overview/)
- [Xero Payroll API](https://developer.xero.com/documentation/api/payrollau/overview)
