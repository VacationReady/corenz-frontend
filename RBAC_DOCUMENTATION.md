# Role-Based Access Control (RBAC) Documentation

## Overview

This document outlines the Role-Based Access Control (RBAC) system implemented in the PeopleCore HRIS application. The system uses a combination of role-based permissions and custom permission profiles to control access to various features and data.

## User Roles

The system defines four primary user roles:
- **EMPLOYEE** - Basic user with limited access
- **MANAGER** - Mid-level user with team management capabilities
- **ADMIN** - Full administrative access within company
- **SUPER_ADMIN** - System-wide administrative access

## Permission System

### Permission Structure
- **Screens**: Different areas/features of the application
- **Actions**: `read`, `edit`, `delete` permissions for each screen
- **Custom Profiles**: Override default role permissions via `PermissionProfile` model

### Core Permission Logic
```typescript
// Admin override: ADMIN and SUPER_ADMIN have all permissions by default
// Unless they have a custom permission profile that restricts them
if ((user.role === "ADMIN" || user.role === "SUPER_ADMIN") && !user.permissionProfile) {
    return true;
}
```

---

# RBAC Permissions Matrix

## EMPLOYEE Role

### ✅ READ Permissions
- **Dashboard** - View personal dashboard
- **Calendar** - View calendar events
- **Documents** - View company-wide and personal documents
- **News** - Read company news posts
- **Leave Requests** - View own leave requests
- **Onboarding** - View onboarding materials

### ✅ WRITE Permissions
- **Leave Requests** - Create and edit own leave requests
- **Profile** - Update own profile information
- **Document Acknowledgement** - Acknowledge required documents
- **Document Signatures** - Sign documents when required

### ❌ DELETE Permissions
- No delete permissions by default

### 📋 Employee Checklist

#### Read Access ✓
- [ ] Personal dashboard
- [ ] Company calendar
- [ ] Company documents (based on department/job role)
- [ ] Personal documents
- [ ] Company news
- [ ] Own leave requests
- [ ] Onboarding materials
- [ ] Own profile information

#### Write Access ✓
- [ ] Create leave requests
- [ ] Edit own leave requests (pending status)
- [ ] Update profile information
- [ ] Acknowledge documents
- [ ] Sign required documents
- [ ] Submit forms (if assigned)

#### Delete Access ❌
- [ ] Cannot delete any records
- [ ] Cannot remove documents
- [ ] Cannot delete leave requests

---

## MANAGER Role

### ✅ READ Permissions
- **Dashboard** - View manager dashboard
- **Employees** - View direct reports and their data
- **Calendar** - View team calendar
- **Documents** - View team and company documents
- **Reports** - View basic reports
- **Organization Chart** - View org structure
- **News** - Read company news
- **Leave Requests** - View team leave requests
- **Working Patterns** - View working patterns
- **Onboarding** - View team onboarding
- **Offboarding** - View team offboarding

### ✅ WRITE Permissions
- **Employees** - Edit direct reports' information
- **Calendar** - Manage team calendar events
- **Documents** - Upload and manage team documents
- **Leave Requests** - Approve/decline team leave requests
- **Performance Reviews** - Conduct team performance reviews

### ❌ DELETE Permissions
- Limited delete permissions (typically restricted to own created content)

### 📋 Manager Checklist

#### Read Access ✓
- [ ] Manager dashboard with team metrics
- [ ] Direct reports' employee records
- [ ] Team calendar and events
- [ ] Team and company documents
- [ ] Basic reporting and analytics
- [ ] Organization chart
- [ ] Company news
- [ ] Team leave requests and approvals
- [ ] Working patterns for team
- [ ] Team onboarding progress
- [ ] Team offboarding processes

#### Write Access ✓
- [ ] Edit direct reports' information
- [ ] Manage team calendar events
- [ ] Upload team documents
- [ ] Approve/decline leave requests
- [ ] Create performance reviews
- [ ] Update team working patterns
- [ ] Manage team onboarding steps
- [ ] Process team offboarding

#### Delete Access ⚠️
- [ ] Delete own created documents (limited)
- [ ] Remove team calendar events (own created)
- [ ] Cannot delete employee records
- [ ] Cannot delete system data

---

## ADMIN Role

### ✅ READ Permissions
**Full read access to all system areas:**
- Dashboard, Approvals, Employees, Calendar, Documents, Reports
- Organization Chart, News, Settings, Onboarding, Offboarding
- Forms, Leave Requests, Working Patterns, Departments, Job Roles
- Permissions, Employee Detail Screens, Training Records
- Audit Logs, Automation Rules, Exit Interviews

### ✅ WRITE Permissions
**Full write access to all system areas:**
- All employee data management
- Company settings and configuration
- Document management and access control
- Leave policies and approval workflows
- Department and job role management
- Permission profile management
- System automation and rules

### ✅ DELETE Permissions
**Full delete access with appropriate safeguards:**
- Employee records (with audit trail)
- Documents and files
- System configurations
- Automation rules and workflows
- News posts and announcements

### 📋 Admin Checklist

#### Read Access ✓
- [ ] Complete system dashboard and metrics
- [ ] All employee records across company
- [ ] All calendar events and bookings
- [ ] All documents (company and employee-specific)
- [ ] Comprehensive reporting and analytics
- [ ] Full organization chart
- [ ] All news and announcements
- [ ] Complete system settings
- [ ] All onboarding templates and instances
- [ ] All offboarding processes
- [ ] All forms and submissions
- [ ] All leave requests and policies
- [ ] All working patterns
- [ ] All departments and job roles
- [ ] Permission profiles and user access
- [ ] Employee training records
- [ ] Audit logs and system activity
- [ ] Automation rules and executions
- [ ] Exit interviews and templates

#### Write Access ✓
- [ ] Manage all employee data
- [ ] Configure company settings
- [ ] Control document access and permissions
- [ ] Manage leave policies and rules
- [ ] Create/edit departments and job roles
- [ ] Configure permission profiles
- [ ] Set up automation rules
- [ ] Manage system integrations
- [ ] Configure approval workflows
- [ ] Manage working patterns
- [ ] Control onboarding/offboarding processes
- [ ] Manage forms and templates
- [ ] Configure calendar rules and restrictions

#### Delete Access ✓
- [ ] Remove employee records (with audit trail)
- [ ] Delete documents and files
- [ ] Remove calendar events
- [ ] Delete news posts
- [ ] Remove form submissions
- [ ] Delete leave requests (admin override)
- [ ] Remove departments/job roles (if not in use)
- [ ] Delete permission profiles
- [ ] Remove automation rules
- [ ] Delete training records
- [ ] Remove audit logs (system retention policy)

---

## SUPER_ADMIN Role

### Inherits all ADMIN permissions plus:

### Additional READ Permissions
- **Tenant Management** - Multi-tenant system access
- **System Configuration** - Global system settings
- **Cross-Company Data** - Access across multiple companies

### Additional WRITE Permissions
- **Company Creation** - Create new company tenants
- **System Maintenance** - Perform system-level maintenance
- **Global Settings** - Configure system-wide settings

### Additional DELETE Permissions
- **Company Deletion** - Remove entire company tenants
- **System Data Cleanup** - Remove system-level data

### 📋 Super Admin Checklist

#### Additional Read Access ✓
- [ ] Multi-tenant company management
- [ ] Global system configuration
- [ ] Cross-company analytics
- [ ] System health and monitoring
- [ ] Database administration tools

#### Additional Write Access ✓
- [ ] Create new company tenants
- [ ] Configure global system settings
- [ ] Perform system maintenance tasks
- [ ] Manage cross-company integrations
- [ ] Configure system-wide policies

#### Additional Delete Access ✓
- [ ] Remove entire company tenants
- [ ] Perform system data cleanup
- [ ] Remove global configurations
- [ ] Delete system-wide resources

---

## Data Access Patterns

### Company Scoping
All data is scoped to the user's company via `companyId` field, preventing cross-company data access.

### Hierarchical Access
- **ADMIN/SUPER_ADMIN**: Access all company data
- **MANAGER**: Access own data + direct reports
- **EMPLOYEE**: Access only own data

### Document Access Control
Documents use role-based flags and department/job role restrictions:
```typescript
// Role-based access flags
canViewAdmin: boolean
canViewManager: boolean  
canViewEmployee: boolean

// Additional restrictions by department/job role
Department: Department[]  // Many-to-many relation
JobRole: JobRole[]       // Many-to-many relation
```

### Permission Profile Override System
Custom permission profiles can override default role permissions:
```typescript
// User model includes optional permission profile
PermissionProfile?: PermissionProfile | null

// Profile contains JSON permission structure
permissions: Json // ScreenPermissions object
```

---

## API Endpoint Protection Patterns

### Authentication Check
```typescript
const session = await getServerSession(authOptions);
if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

### Role-Based Authorization
```typescript
// Direct role check
if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

// Permission-based check
const hasAccess = hasPermission(user, "documents", "read");
if (!hasAccess) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Data Scoping
```typescript
// Company scoping
const whereCondition = { companyId: session.user.companyId };

// Manager scope limitation
if (session.user.role === "MANAGER") {
    whereCondition.user = {
        id: { in: [session.user.id, ...subordinateUserIds] }
    };
}
```

---

## Security Considerations

### Access Control Enforcement
1. **Server-side validation**: All permissions checked on API routes
2. **Session-based auth**: JWT tokens with role information
3. **Company isolation**: Strict company scoping prevents data leaks
4. **Audit trails**: All actions logged for compliance

### Permission Hierarchy
1. **Admin override**: ADMIN/SUPER_ADMIN bypass most restrictions
2. **Custom profiles**: Can restrict admin access if needed
3. **Logical consistency**: Read permission required for edit/delete
4. **Fail-safe defaults**: Unknown roles default to EMPLOYEE permissions

### Data Protection
1. **Multi-tenancy**: Complete isolation between companies
2. **Role-based views**: UI adapts based on user permissions
3. **Document access**: Fine-grained control by role, department, job role
4. **Employee privacy**: Managers only see direct reports

---

## Implementation Notes

### Database Models
- **User**: Core user with role and optional permission profile
- **PermissionProfile**: Custom permission overrides
- **Employee**: Extended user data with company scoping
- **Company**: Multi-tenant isolation boundary

### Frontend Components
- **Role-specific sidebars**: AdminSidebar, ManagerSidebar, EmployeeSidebar
- **Conditional rendering**: Features shown based on permissions
- **Route protection**: Layout components enforce access control

### API Security
- **Authentication middleware**: Session validation on all routes
- **Authorization checks**: Role and permission validation
- **Data filtering**: Results filtered by user scope and permissions
- **Error handling**: Consistent unauthorized/forbidden responses

This RBAC system provides comprehensive access control while maintaining flexibility through custom permission profiles and hierarchical data access patterns.
