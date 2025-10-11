# Tenant Admin Portal

A dedicated, password-protected portal for managing all tenants across the system, independent of the existing user/role system.

## Features

✅ **Independent Authentication** - Uses password-based auth separate from NextAuth  
✅ **System-Wide Access** - View and manage ALL tenants across the platform  
✅ **Secure Session** - 24-hour cookie-based sessions with httpOnly security  
✅ **Full CRUD Operations** - Create, view, and delete tenants  
✅ **Complete Tenant Seeding** - Automatically creates department, permission profiles, and admin user  
✅ **Automatic Activation Emails** - Admin receives email with activation link automatically  
✅ **Tenant Statistics** - See user and employee counts per tenant  
✅ **Clean UI** - Modern, responsive interface with real-time updates

## Setup

### 1. Configure Environment Variable

Add to your `.env.local` file:

```bash
TENANT_ADMIN_PASSWORD=your_super_secure_password
```

⚠️ **Security Note**: Use a strong, unique password. This bypasses all normal authentication.

### 2. Access the Portal

Navigate to: **`/tenant-admin`**

Enter your configured password to access the dashboard.

## Usage

### Login
- Visit `/tenant-admin`
- Enter your `TENANT_ADMIN_PASSWORD`
- Click "Access Portal"

### Dashboard Features

**Overview Stats**
- Total number of tenants
- Total users across all tenants
- Total employees across all tenants

**Tenant Management**
- View all tenants with detailed stats
- See user count and employee count per tenant
- View creation dates and tenant IDs

**Create New Tenant**
1. Click "Create Tenant" button
2. Fill in the form:
   - Company Name (e.g., "Acme Corporation")
   - Admin Full Name (e.g., "John Smith")
   - Admin Email (e.g., "admin@acme.com")
3. Review what will be created:
   - ✓ Company tenant
   - ✓ Default "General" department
   - ✓ 3 permission profiles (Admin, Manager, Employee)
   - ✓ Admin user account
   - ✓ Activation email sent automatically
4. Click "Create"
5. Copy the activation link (backup - email is already sent)
6. Admin receives activation email and can set their password

**Switch to Tenant**
1. Click "Switch to Tenant" button on any tenant card
2. A new tab opens automatically
3. You're logged in as an admin user of that tenant
4. Access their dashboard and all features
5. ⏰ Switch tokens are valid for 5 minutes

**Delete Tenant**
1. Click "Delete" button on any tenant card
2. Confirm deletion (includes user/employee counts)
3. ⚠️ **Warning**: This permanently deletes all associated data

### Logout
- Click "Logout" button in the top right
- Session cookie is cleared
- Redirected to login page

## API Endpoints

All endpoints require authentication via `tenant_admin_session` cookie:

### Authentication
- **POST** `/api/tenant-admin/login` - Authenticate with password
- **POST** `/api/tenant-admin/logout` - Clear session
- **GET** `/api/tenant-admin/verify` - Check auth status

### Tenant Management
- **GET** `/api/tenant-admin/tenants` - List all tenants with stats
- **POST** `/api/tenant-admin/tenants` - Create new tenant with full seeding
  ```json
  {
    "companyName": "Acme Corporation",
    "adminName": "John Smith",
    "adminEmail": "admin@acme.com"
  }
  ```
  Creates: Company, Department (General), 3 Permission Profiles, Admin User, Employee record, Activation Token, and sends activation email
- **POST** `/api/tenant-admin/switch` - Generate tenant switch token
  ```json
  { "companyId": "tenant-id" }
  ```
  Returns: `{ "token": "...", "companyId": "...", "companyName": "..." }`
  
- **POST** `/api/tenant-admin/process-switch` - Process switch token and authenticate
  ```json
  { "token": "switch-token" }
  ```
  Returns temporary credentials for auto-login
  
- **DELETE** `/api/tenant-admin/tenants` - Delete tenant
  ```json
  { "companyId": "tenant-id" }
  ```

## Security Considerations

1. **Password Protection**: The portal is only accessible with the correct password
2. **HttpOnly Cookies**: Session cookies cannot be accessed via JavaScript
3. **24-Hour Sessions**: Automatic logout after 24 hours
4. **No SUPER_ADMIN Required**: Completely bypasses the existing role system
5. **Production Security**: Uses secure cookies in production environments

## Differences from `/tenants` Page

| Feature | `/tenant-admin` | `/tenants` |
|---------|-----------------|------------|
| Authentication | Password-based | SUPER_ADMIN role required |
| Access Control | Environment variable | User role + homeCompanyId check |
| Tenant Seeding | ✅ Full seeding | ✅ Full seeding |
| Activation Email | ✅ Auto-sent | ✅ Auto-sent |
| User Stats | ✅ Shows user/employee counts | ❌ Basic info only |
| Session Type | Cookie-based | NextAuth JWT |
| Portal Design | Dedicated standalone UI | Integrated with main app |
| Logout Option | ✅ Built-in logout | Uses main app logout |
| Tenant Switching | ✅ **NEW!** Opens in new tab | ✅ Switches current session |

**Recommendation:** Use `/tenant-admin` as your primary tenant management portal. It now has full tenant switching capabilities and works independently of user roles.

## Troubleshooting

**Issue**: "Tenant admin portal is not configured"  
**Solution**: Ensure `TENANT_ADMIN_PASSWORD` is set in your `.env.local` file

**Issue**: Redirected to login after accessing dashboard  
**Solution**: Your session expired (24 hours). Log in again.

**Issue**: Can't delete a tenant  
**Solution**: Check for database cascade delete constraints. Some tenants may have protected data.

**Issue**: "Switch to Tenant" button is disabled  
**Solution**: The tenant has no users. Create at least one admin user first.

**Issue**: Switch token expired  
**Solution**: Switch tokens are valid for 5 minutes. Generate a new one by clicking the button again.

**Issue**: Database migration error for TenantSwitchToken  
**Solution**: Run the migration:
```bash
npx prisma migrate dev --name add_tenant_switch_token
# Or manually run: prisma/migrations/tenant_switch_token.sql
```

## Best Practices

1. **Use Strong Passwords**: Generate a long, random password for `TENANT_ADMIN_PASSWORD`
2. **Limit Access**: Only share the password with trusted system administrators
3. **Regular Audits**: Periodically review tenant list and clean up unused tenants
4. **Backup Before Delete**: Always backup data before deleting tenants
5. **Monitor Usage**: Keep logs of who accesses the portal and when

## Future Enhancements

Potential features to add:
- Activity logging for all admin actions
- Multi-factor authentication
- Tenant usage analytics and reports
- Bulk tenant operations
- Tenant backup/restore functionality
- Email notification on tenant creation/deletion
- IP whitelist for additional security
