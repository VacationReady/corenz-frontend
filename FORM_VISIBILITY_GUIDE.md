# Form Visibility and Filtering Guide

## Overview

Forms can now be restricted to specific departments and job roles, ensuring that employees only see forms relevant to their position. For example, you can create an "HGV Screen" form that only appears for employees with the "Driver" job role.

## How It Works

### Form Visibility Logic

When a form is configured with visibility settings, employees must meet **ALL** of the following criteria to see it:

1. **Role Match** (Required): The employee's user role (Admin, Manager, or Employee) must be in the selected roles
2. **Department Match** (Optional): If departments are selected, the employee must be in one of those departments
3. **Job Role Match** (Optional): If job roles are selected, the employee must have one of those job roles

### Visibility Rules

- **If NO departments are selected**: Form is visible to all departments (department filter is ignored)
- **If NO job roles are selected**: Form is visible to all job roles (job role filter is ignored)
- **If departments ARE selected**: Only employees in those departments can see the form
- **If job roles ARE selected**: Only employees with those job roles can see the form

## Setting Up Form Visibility

### Step 1: Access Form Builder

1. Navigate to **Settings** → **Forms & Surveys**
2. Click **New Form** or edit an existing form

### Step 2: Configure Visibility Settings

In the Form Builder, you'll find the **Visibility Settings** panel on the right side of the screen, below the Form Preview.

#### Configure User Roles (Required)
- Check at least one role: **Admin**, **Manager**, or **Employee**
- This determines which user permission levels can access the form

#### Configure Departments (Optional)
- Leave empty to allow all departments
- Check specific departments to restrict access
- Example: Select "Operations" and "Logistics" to limit the form to those departments only

#### Configure Job Roles (Optional)
- Leave empty to allow all job roles
- Check specific job roles to restrict access
- Example: Select "Driver" to limit the form to employees with that job role

### Step 3: Save the Form

Click **Save Form** to apply your visibility settings.

## Common Use Cases

### Example 1: HGV Screen for Drivers Only

**Scenario**: You need a Heavy Goods Vehicle screening form that only drivers should complete.

**Configuration**:
- **User Roles**: ✓ Employee
- **Departments**: (Leave empty - drivers can be in any department)
- **Job Roles**: ✓ Driver

**Result**: Only employees with the "Driver" job role will see this form in their profile.

### Example 2: Department-Specific Safety Form

**Scenario**: A safety checklist for the Warehouse department only.

**Configuration**:
- **User Roles**: ✓ Employee, ✓ Manager
- **Departments**: ✓ Warehouse
- **Job Roles**: (Leave empty - all warehouse job roles)

**Result**: All employees and managers in the Warehouse department will see this form.

### Example 3: Manager Performance Reviews

**Scenario**: A performance review form that only managers should complete.

**Configuration**:
- **User Roles**: ✓ Manager
- **Departments**: (Leave empty)
- **Job Roles**: (Leave empty)

**Result**: All users with the Manager role will see this form.

### Example 4: Specific Job Role in Specific Department

**Scenario**: A forklift certification form for Forklift Operators in the Warehouse.

**Configuration**:
- **User Roles**: ✓ Employee
- **Departments**: ✓ Warehouse
- **Job Roles**: ✓ Forklift Operator

**Result**: Only employees who are Forklift Operators in the Warehouse department will see this form.

## Where Forms Appear

Forms that match an employee's visibility criteria will appear:

1. **Employee Profile**: `/employees/[id]/[form-slug]`
2. **Forms List**: On the employee's forms page
3. **Dashboard**: In any form-related widgets or onboarding flows

## Viewing Form Visibility Settings

On the **Forms & Surveys** page (`/settings/forms`), each form card displays:

- **Roles**: Which user role levels can access the form
- **Departments**: Which departments can access the form (if restricted)
- **Job Roles**: Which job roles can access the form (if restricted)

This makes it easy to see at a glance which forms are available to which groups of employees.

## Technical Details

### Database Schema

Forms use the following fields for visibility:

```prisma
model Form {
  visibleToRoles       String[]  @default([])  // User roles: ADMIN, MANAGER, EMPLOYEE
  visibleToDepartments String[]  @default([])  // Department IDs
  visibleToJobRoles    String[]  @default([])  // Job Role names
}
```

### API Filtering

The form retrieval API (`/api/forms/by-slug/[slug]`) automatically filters forms based on the requesting employee's:
- User role (from `User.role`)
- Department ID (from `User.departmentId`)
- Job Role name (from `User.JobRole.name`)

This ensures that employees can only access forms they're authorized to see, even if they know the form's URL.

## Troubleshooting

### Form Not Appearing for Employee

If a form isn't appearing for an employee who should see it:

1. **Check User Role**: Verify the employee's user role is selected in the form's visibility settings
2. **Check Department**: If departments are selected on the form, verify the employee is in one of those departments
3. **Check Job Role**: If job roles are selected on the form, verify the employee has one of those job roles
4. **Check Employee Profile**: Ensure the employee has a complete profile with department and job role assigned

### Form Appearing for Wrong Employees

If a form is appearing for employees who shouldn't see it:

1. Review the form's visibility settings
2. Ensure all necessary restrictions (departments/job roles) are properly selected
3. Remember: Empty department or job role lists mean "visible to all"

## Best Practices

1. **Start Broad, Then Narrow**: Begin with role-based visibility, then add department/job role restrictions as needed
2. **Document Your Intent**: Use the form's description field to note who should see it
3. **Test Visibility**: After configuring a form, test it by viewing an employee profile who should (and shouldn't) see it
4. **Review Regularly**: Periodically review form visibility settings as your organization changes
5. **Use Job Roles**: For the most specific targeting, assign job roles to employees and use job role filters

## Migration Notes

All existing forms will continue to work as before. If a form has no specific departments or job roles selected, it will be visible to all users with the appropriate role level.

To restrict existing forms:
1. Edit the form in the Form Builder
2. Configure the new visibility settings
3. Save the form

No database migration is required as the schema already supports these fields.

