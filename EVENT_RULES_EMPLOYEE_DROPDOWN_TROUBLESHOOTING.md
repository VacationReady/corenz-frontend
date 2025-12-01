# Event Rules Employee Dropdown - Troubleshooting Guide

## Issue
Employee dropdown shows search bar but no employees are displayed, even when searching.

## Debugging Steps Implemented

### 1. Console Logging Added
The code now logs the following information to the browser console:

```typescript
// In fetchData():
console.log("Employee API Response:", empData);
console.log("Employees array:", empData.employees || empData);
console.log("Setting employees:", employeeList);

// When opening the dropdown:
// (You can check employees state in React DevTools)
```

### 2. Visual Feedback Added
- Employee count is displayed in the label: `Employee (Optional) (X available)`
- Better empty state message distinguishes between:
  - No employees loaded from API
  - No employees matching search criteria

### 3. API Response Handling Improved
```typescript
// Handles both response formats:
const employeeList = Array.isArray(empData) ? empData : (empData.employees || []);
```

### 4. Field Name Compatibility
Handles both lowercase `user` and uppercase `User` from API:
```typescript
const firstName = emp.user?.firstName || emp.User?.firstName || '';
const lastName = emp.user?.lastName || emp.User?.lastName || '';
```

## How to Diagnose the Issue

### Step 1: Open Browser Console
1. Open the Event Rules page
2. Press F12 to open Developer Tools
3. Go to the "Console" tab
4. Look for these messages:
   - "Employee API Response:"
   - "Employees array:"
   - "Setting employees:"

### Step 2: Check the Logs

#### If you see: `Employees array: []` or `Setting employees: []`
**Problem**: The API is returning an empty array

**Possible causes**:
- No employees exist in the company
- User doesn't have permission to view employees
- API filter is too restrictive (check `limit=100` in URL)

**Solutions**:
1. Check if employees exist: Go to the Employees page
2. Check user role/permissions
3. Increase the limit in the fetch call

#### If you see: `Employees array: undefined` or `null`
**Problem**: The API response structure is unexpected

**Possible causes**:
- API endpoint is returning an error
- Response format has changed
- Authentication issue

**Solutions**:
1. Check Network tab in DevTools
2. Look for `/api/employees?limit=100` request
3. Check the response status and body

#### If you see employees in the log but dropdown is still empty
**Problem**: Rendering issue with the Command component

**Possible causes**:
- Employee objects missing required fields
- Name fields are empty/undefined
- React key conflicts

**Solutions**:
1. Check the structure of the first employee:
   ```javascript
   console.log("First employee:", employees[0])
   ```
2. Verify it has either:
   - `user.firstName` and `user.lastName`, OR
   - `User.firstName` and `User.lastName`

### Step 3: Check Network Request

1. Open Network tab in DevTools
2. Filter by "employees"
3. Look for the request to `/api/employees?limit=100`
4. Check:
   - **Status**: Should be 200 OK
   - **Response**: Should contain an array or object with `employees` array
   - **Headers**: Check if `x-company-id` is set (if required)

### Step 4: Check Employee Data Structure

The expected employee structure is:
```typescript
{
  id: string,
  user: {
    firstName: string,
    lastName: string,
    email: string
  }
  // OR (uppercase User)
  User: {
    firstName: string,
    lastName: string,
    email: string
  }
}
```

## Common Issues and Solutions

### Issue 1: "No employees loaded. Check console for errors."
**Meaning**: The `employees` array is empty after fetching

**Check**:
1. Console logs for API errors
2. Network tab for failed requests
3. Whether employees exist in the system

**Fix**: Ensure employees are created and the API is accessible

### Issue 2: Employee dropdown shows count but no names
**Meaning**: Employees are loaded but names are missing

**Check**:
```javascript
// In console:
employees.forEach(emp => {
  console.log(emp.id, emp.user || emp.User);
});
```

**Fix**: Verify the API includes `User` relation with `firstName` and `lastName`

### Issue 3: Search doesn't work
**Meaning**: cmdk filtering is not working

**Check**: The `value` prop on `CommandItem` must contain searchable text

**Current implementation**:
```typescript
<CommandItem
  value={fullName}  // This is what's searched
  ...
>
  <span>{fullName}</span>
</CommandItem>
```

### Issue 4: Dropdown closes immediately
**Check**: React strict mode or event propagation issues

**Fix**: Already handled with `onSelect` closing the popover

## API Endpoint Details

### Endpoint
```
GET /api/employees?limit=100
```

### Expected Response Format (Option 1)
```json
{
  "employees": [
    {
      "id": "emp-123",
      "user": {
        "firstName": "John",
        "lastName": "Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

### Expected Response Format (Option 2)
```json
[
  {
    "id": "emp-123",
    "User": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
]
```

Both formats are now supported!

## Quick Fixes to Try

### 1. Refresh the page
Sometimes the initial fetch fails. A refresh might help.

### 2. Check your role
Only users with appropriate permissions can see employees:
- SUPER_ADMIN: Can see all employees
- ADMIN: Can see all employees
- MANAGER: Can see direct and indirect reports
- EMPLOYEE: Can see themselves and department colleagues

### 3. Verify company context
The API requires a valid `companyId` from the session.

### 4. Check the limit parameter
The fetch uses `limit=100`. If you have more than 100 employees:
- Increase the limit: `fetch("/api/employees?limit=500")`
- Or implement pagination/infinite scroll

### 5. Test the API directly
Open in browser or Postman:
```
http://localhost:3000/api/employees?limit=100
```

## Manual Testing Checklist

- [ ] Open Event Rules page
- [ ] Check browser console for logs
- [ ] Look at the label - does it show "(X available)"?
- [ ] Click on Employee dropdown
- [ ] Do you see "All employees" option?
- [ ] Do you see any employee names below it?
- [ ] Type in the search box - does it filter?
- [ ] Select an employee - does dropdown close?
- [ ] Does the button show the selected name?

## Code Locations

### Employee Fetch
`app/(withSidebar)/settings/event-rules/page.tsx` line ~166
```typescript
fetch("/api/employees?limit=100")
```

### Employee Combobox
`app/(withSidebar)/settings/event-rules/page.tsx` line ~600-670

### API Endpoint
`app/api/employees/route.ts`

## Next Steps

If employees still don't appear after checking all the above:

1. **Capture the console logs** and share them
2. **Check the Network tab** response for `/api/employees?limit=100`
3. **Verify employees exist** by navigating to the Employees page
4. **Check session/auth** - ensure you're logged in with proper permissions

## Additional Debug Code

If you need more detailed debugging, you can temporarily add this to the component:

```typescript
// After the employees state definition
useEffect(() => {
  console.log("Employees state updated:", employees);
  if (employees.length > 0) {
    console.log("Sample employee:", JSON.stringify(employees[0], null, 2));
  }
}, [employees]);
```

This will log every time the employees state changes.















