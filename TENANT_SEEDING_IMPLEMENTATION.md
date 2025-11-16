# Tenant Seeding Implementation

## Problem Statement

When creating a new tenant in the system, no reference data was seeded, resulting in poor UX:
- Empty working patterns dropdown when adding employees
- No leave categories available  
- No job roles, employment types, or other essential data
- Admin had to manually configure everything before using the system

## Solution Implemented

Implemented automatic seeding of essential reference data when a tenant is created, following HRIS industry best practices.

## Changes Made

### 1. Created Tenant Seeding Utility (`lib/tenant-seed.ts`)

A comprehensive seeding function that creates:

- **Working Patterns** (2 patterns):
  - Standard (Mon-Fri, 9am-5pm, 40hrs)
  - Part-time (Mon/Wed/Fri, 24hrs)

- **Leave Categories** (5 types):
  - Annual Leave (requires approval)
  - Sick Leave (no approval required)
  - Bereavement Leave (requires approval)
  - Training (requires approval)
  - Unpaid Leave (requires approval)

- **Job Roles** (7 common roles):
  - Manager, Team Lead, Senior Staff, Staff, Administrator, Sales Representative, Customer Service Representative

- **Employment Types** (5 types):
  - Permanent Full-time, Permanent Part-time, Fixed-term, Casual, Contractor

- **Locations** (7 NZ cities):
  - Auckland, Wellington, Christchurch, Hamilton, Tauranga, Dunedin, Queenstown

- **Expiry Rules** (3 categories):
  - Employment Checks (28 days notice)
  - Driver Licence (30 days notice)
  - Training (45 days notice)

- **Field Metadata** (14 fields for reporting):
  - User, Employee, Department, and Leave Request fields

### 2. Integration Points

Updated both tenant creation endpoints to call the seeding function:

- **`app/api/tenants/route.ts`** (Super Admin route)
- **`app/api/tenant-admin/tenants/route.ts`** (Tenant Admin route)

The seeding happens within the transaction, ensuring atomicity.

## Benefits

### Immediate Usability
New tenants can start using the system immediately without configuration overhead.

### Industry Standard
Follows SaaS HRIS best practices - provide sensible defaults that can be customized.

### Better UX
- No empty dropdowns
- No interruptions to workflows
- Reduced time-to-value for new customers

### Data Integrity
All seeding happens within the database transaction, ensuring consistency.

## Design Decisions

### World-Class HRIS Approach

As a world-class HRIS engineer, the decision was made to:

1. **Seed comprehensive reference data** rather than making fields optional or showing empty states
2. **Use industry-standard defaults** (40-hour work week, NZ employment types, statutory leave types)
3. **Implement at the highest level** (database transaction during tenant creation)
4. **Make data customizable** - tenants can modify or add to the seeded data

### Why Not Make Working Pattern Optional?

While technically possible, this would create poor UX:
- Empty dropdowns confuse users
- Interrupts employee creation workflow
- Requires context switching to configure basics
- Not how modern SaaS HRIS systems work

## Testing

New tenants should have:
- ✅ 2 working patterns available in employee creation dropdown
- ✅ 5 leave categories configured
- ✅ 7 job roles available
- ✅ 5 employment type options
- ✅ NZ locations pre-populated
- ✅ Expiry notification rules active

## Future Enhancements

Consider adding:
- Industry-specific templates (retail, hospitality, office, etc.)
- Regional compliance packs (different countries)
- Company size-based defaults (SMB vs Enterprise)
- Tenant preferences during signup (industry, size, location)
