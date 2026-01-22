# Azure AD OAuth "invalid_client" Error - Resolution Guide

## Error Details
```
OAuthCallbackError: OAuth Provider returned an error: invalid_client
```

This error occurs during the Microsoft/Azure AD OAuth callback (302 redirect), indicating the OAuth provider rejected the authentication request.

## Root Causes & Solutions

### 1. Missing or Incorrect Environment Variables (Most Common)

**Check your production environment variables:**

Required variables:
- `AZURE_AD_CLIENT_ID` - Application (client) ID from Azure AD
- `AZURE_AD_CLIENT_SECRET` - Client secret value (not the secret ID)
- `AZURE_AD_TENANT_ID` - Directory (tenant) ID from Azure AD
- `NEXTAUTH_URL` - Your production URL (e.g., https://app.peoplecore.co.nz)
- `NEXTAUTH_SECRET` - Random string for JWT encryption

**Action:** Verify all three Azure AD variables are set in your production environment (Vercel/AWS Lambda/etc.)

### 2. Redirect URI Mismatch in Azure AD

The redirect URI registered in Azure AD **must exactly match**:
```
https://your-domain.com/api/auth/callback/azure-ad
```

**Steps to fix in Azure Portal:**
1. Go to Azure Portal → Azure Active Directory → App registrations
2. Select your application
3. Go to "Authentication" → "Platform configurations" → "Web"
4. Add redirect URI: `https://your-production-domain.com/api/auth/callback/azure-ad`
5. Ensure "ID tokens" is checked under "Implicit grant and hybrid flows"
6. Save changes

### 3. Expired Client Secret

Azure AD client secrets expire (typically after 1-2 years).

**Steps to regenerate:**
1. Azure Portal → App registrations → Your app
2. Go to "Certificates & secrets"
3. Create new client secret
4. Copy the **Value** (not Secret ID) immediately
5. Update `AZURE_AD_CLIENT_SECRET` in your production environment

### 4. Wrong Client Secret Value

Ensure you're using the **secret value**, not the secret ID.

### 5. API Permissions Not Granted

Required permissions for Azure AD:
- `openid`
- `profile`
- `email`
- `User.Read`

**Steps to verify:**
1. Azure Portal → App registrations → Your app
2. Go to "API permissions"
3. Ensure Microsoft Graph permissions are granted
4. Click "Grant admin consent" if needed

## Debugging Steps

### Step 1: Check Server Logs
The code now includes enhanced logging. Check your production logs for:
```
[auth-options] Azure AD provider configured
[auth-options] CRITICAL: Incomplete Azure AD configuration
```

### Step 2: Verify Environment Variables
Add a temporary debug endpoint to verify variables are loaded:
```typescript
// app/api/debug/auth-config/route.ts
export async function GET() {
  return Response.json({
    hasAzureClientId: !!process.env.AZURE_AD_CLIENT_ID,
    hasAzureSecret: !!process.env.AZURE_AD_CLIENT_SECRET,
    hasTenantId: !!process.env.AZURE_AD_TENANT_ID,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    expectedCallback: `${process.env.NEXTAUTH_URL}/api/auth/callback/azure-ad`,
  });
}
```

**⚠️ Remove this endpoint after debugging!**

### Step 3: Test Locally
1. Copy production environment variables to `.env.local`
2. Test Microsoft sign-in locally
3. If it works locally but fails in production → environment variable issue

### Step 4: Check Azure AD Logs
1. Azure Portal → Azure Active Directory → Sign-in logs
2. Look for failed sign-in attempts
3. Check error details for specific failure reason

## Configuration Checklist

- [ ] `AZURE_AD_CLIENT_ID` is set in production
- [ ] `AZURE_AD_CLIENT_SECRET` is set in production (use secret **value**, not ID)
- [ ] `AZURE_AD_TENANT_ID` is set in production
- [ ] `NEXTAUTH_URL` matches your production domain
- [ ] `NEXTAUTH_SECRET` is set (min 32 characters)
- [ ] Redirect URI in Azure AD matches: `https://your-domain.com/api/auth/callback/azure-ad`
- [ ] Client secret has not expired
- [ ] API permissions are granted in Azure AD
- [ ] "ID tokens" is enabled in Azure AD app authentication settings

## Quick Fix Commands

### Regenerate NEXTAUTH_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Verify Environment in Production (Vercel)
```bash
vercel env ls
vercel env pull .env.production
```

### Verify Environment in Production (AWS)
Check your Lambda environment variables or SSM Parameter Store.

## Code Changes Made

Enhanced logging in `app/lib/auth-options.ts`:
- Validates Azure AD configuration at startup
- Logs expected callback URL
- Logs sign-in events for debugging
- Provides detailed error messages for missing configuration

## Next Steps

1. **Immediate:** Check production environment variables
2. **Verify:** Redirect URI in Azure AD portal
3. **Test:** Create debug endpoint to confirm variables are loaded
4. **Monitor:** Check production logs for the new diagnostic messages
5. **Validate:** Test Microsoft sign-in after fixes

## Support Resources

- [NextAuth.js Azure AD Provider Docs](https://next-auth.js.org/providers/azure-ad)
- [Azure AD App Registration Guide](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [NextAuth.js Debugging Guide](https://next-auth.js.org/configuration/options#debug)
