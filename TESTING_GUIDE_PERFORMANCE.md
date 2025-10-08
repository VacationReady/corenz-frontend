# Performance Management - Testing Guide

## 🚀 Quick Start

After `npm install` completes, test the new functionality:

```bash
npm run dev
```

Navigate to: **`http://localhost:3000/performance`** (as admin user)

---

## ✅ Test Checklist

### 1️⃣ Schedule 1-2-1 Meeting (Basic)

**Steps:**
1. Click **"Schedule 1-2-1"** button (Quick Actions card or Meetings tab)
2. Fill in:
   - Title: "Test Meeting"
   - Date & Time: Tomorrow, 10:00 AM
   - Duration: 30 minutes
3. Participant Selection: Individual mode
4. Select 1-2 employees (check boxes)
5. Keep "Send email invitations" checked
6. Click **"Schedule Meeting"**

**Expected Result:**
- ✅ Success toast: "Meeting scheduled successfully"
- ✅ Dialog closes
- ✅ Page refreshes with new meeting in "Upcoming 1-2-1s"

---

### 2️⃣ Schedule Recurring Meeting

**Steps:**
1. Click **"Schedule 1-2-1"** button
2. Fill in basic details
3. Check **"Make this a recurring meeting"**
4. Select pattern: **Weekly**
5. Set end date: 3 months from now (or leave blank)
6. Select participants (filter by department: Engineering)
7. Click **"Create Recurring Meetings"**

**Expected Result:**
- ✅ Success toast: "Recurring meetings created successfully"
- ✅ Series of meetings created with same `seriesId`

---

### 3️⃣ Filter-Based Participant Selection

**Steps:**
1. Open Schedule Meeting dialog
2. Participant Selection → Select **"Select by filters"**
3. Set filters:
   - Status: Active
   - Department: Sales (if you have one)
   - Job Role: Manager (if you have one)
4. Enter search query: Part of a name
5. Check the count badge

**Expected Result:**
- ✅ Badge shows: "X employee(s) match these filters"
- ✅ Count updates when changing filters
- ✅ Participant count at bottom shows total

---

### 4️⃣ Create Review Cycle (Basic)

**Steps:**
1. Click **"Create Review Cycle"** button
2. Fill in:
   - Name: "Q1 2025 Test Review"
   - Type: Quarterly
   - Start Date: Next week
   - End Date: End of next month
3. Participant Selection: Individual mode
4. Select 2-3 employees
5. Keep "Send email notifications" checked
6. Click **"Create Review Cycle"**

**Expected Result:**
- ✅ Success toast: "Review cycle created successfully"
- ✅ Dialog closes
- ✅ Cycle created with status: DRAFT

---

### 5️⃣ Review Cycle with Deadlines

**Steps:**
1. Open Create Review Cycle dialog
2. Set basic details
3. Expand "Review Deadlines" section
4. Set different deadlines:
   - Self-Review: 1 week after start
   - Manager Review: 2 weeks after start
   - Peer Review: 3 weeks after start
5. Toggle **"Make peer reviews anonymous"** ON
6. Select participants
7. Submit

**Expected Result:**
- ✅ Cycle created with all deadlines set
- ✅ `isAnonymousPeer` = true in database
- ✅ Settings saved in JSON field

---

### 6️⃣ Bulk Participant Selection

**Steps:**
1. Open Create Review Cycle dialog
2. Participant Selection → **"Select by filters"**
3. Set filters:
   - Status: Active
   - Department: All Departments
4. Note the participant count

**Expected Result:**
- ✅ Badge shows all active employees count
- ✅ Cycle will include all active employees
- ✅ Can refine with additional filters

---

### 7️⃣ Validation Testing

**Try these to test validation:**

**Missing Required Fields:**
- Submit meeting without title → Error toast
- Submit meeting without date → Error toast
- Submit meeting without participants → Error toast
- Submit review cycle without name → Error toast
- Submit review cycle without dates → Error toast

**Expected Result:**
- ✅ All validation errors show toast messages
- ✅ Form doesn't submit
- ✅ Dialog stays open

---

### 8️⃣ UI/UX Testing

**Check these user experience elements:**

**Loading States:**
- ✅ "Scheduling..." text when submitting meeting
- ✅ "Creating..." text when submitting review cycle
- ✅ Buttons disabled during submission

**Dialog Behavior:**
- ✅ ESC key closes dialog
- ✅ Click outside closes dialog
- ✅ Form resets after successful submission
- ✅ Cancel button works

**Responsive Design:**
- ✅ Dialog scrolls if content too tall
- ✅ Filters stack properly on smaller screens

---

## 🔍 Database Verification

After creating meetings/cycles, check the database:

### Check Meetings
```sql
SELECT * FROM "PerformanceMeeting" 
WHERE companyId = 'your-company-id' 
ORDER BY createdAt DESC 
LIMIT 5;
```

**Verify:**
- ✅ Title, scheduledAt, duration saved correctly
- ✅ participantIds array populated
- ✅ isRecurring set properly
- ✅ seriesId exists for recurring meetings

### Check Review Cycles
```sql
SELECT * FROM "PerformanceReviewCycle" 
WHERE companyId = 'your-company-id' 
ORDER BY createdAt DESC 
LIMIT 5;
```

**Verify:**
- ✅ Name, type, dates saved
- ✅ Deadlines set if provided
- ✅ participantIds array populated
- ✅ isAnonymousPeer set correctly
- ✅ status = 'DRAFT'

### Check Cycle Participants
```sql
SELECT * FROM "CycleParticipant" 
WHERE cycleId = 'your-cycle-id';
```

**Verify:**
- ✅ One record per participant
- ✅ employeeId matches participantIds array
- ✅ status = 'NOT_STARTED'
- ✅ All boolean flags false initially

---

## 🐛 Known Limitations (To Implement Later)

### Email Notifications
The dialogs reference these endpoints but they don't exist yet:
- `/api/notifications/meeting-invite`
- `/api/notifications/review-cycle-created`

**Current Behavior:** 
- Email toggle exists in UI
- API call fires but may fail silently
- Main functionality works regardless

**Future Implementation:**
```typescript
// /app/api/notifications/meeting-invite/route.ts
POST handler to send calendar invites

// /app/api/notifications/review-cycle-created/route.ts  
POST handler to notify participants
```

### Template Integration
Templates are loaded but not fully utilized:
- Meeting templates load agenda structure
- Review templates load question structure
- Full template rendering not implemented yet

### Recurrence Logic
Recurring meetings create single entry with metadata:
- `isRecurring: true`
- `recurrence: { type, endDate }`
- `seriesId: UUID`

**Missing:** Background job to generate actual meeting instances

---

## 📊 Expected API Responses

### Successful Meeting Creation
```json
{
  "meeting": {
    "id": "uuid",
    "title": "Test Meeting",
    "scheduledAt": "2025-10-09T10:00:00Z",
    "duration": 30,
    "participantIds": ["emp-1", "emp-2"],
    "isRecurring": false,
    "organizerId": "user-id",
    "status": "SCHEDULED",
    "Organizer": {
      "firstName": "John",
      "lastName": "Doe"
    }
  }
}
```

### Successful Review Cycle Creation
```json
{
  "cycle": {
    "id": "uuid",
    "name": "Q1 2025 Test Review",
    "type": "QUARTERLY",
    "status": "DRAFT",
    "startDate": "2025-01-01",
    "endDate": "2025-03-31",
    "participantIds": ["emp-1", "emp-2", "emp-3"],
    "isAnonymousPeer": true,
    "Creator": {
      "firstName": "Admin",
      "lastName": "User"
    }
  },
  "participants": [
    {
      "id": "uuid",
      "cycleId": "cycle-id",
      "employeeId": "emp-1",
      "status": "NOT_STARTED"
    }
  ]
}
```

---

## 🚨 Troubleshooting

### Dialog Doesn't Open
**Issue:** Button click does nothing

**Check:**
1. Console for React errors
2. Verify imports in performance page
3. Check state management setup

**Fix:** Dialog state should be `useState(false)` initially

---

### No Employees in Dropdown
**Issue:** Participant selection shows empty

**Check:**
1. `/api/employees` endpoint returns data
2. Employee `isActive` status
3. Console for fetch errors

**Fix:** Ensure employees exist in database with correct companyId

---

### Validation Errors Not Showing
**Issue:** Form submits without required fields

**Check:**
1. Zod schema in API route
2. Client-side validation logic
3. Toast notification setup

**Fix:** Verify validation runs before API call

---

### Can't Select Participants
**Issue:** Checkboxes don't work

**Check:**
1. React state updates for `selectedParticipants`
2. Set operations working correctly
3. onChange handlers connected

**Fix:** Use `new Set()` for state updates

---

### Database Errors
**Issue:** 500 error when creating

**Common Causes:**
- Missing companyId
- Invalid UUID format
- Foreign key constraints
- Required fields null

**Check Server Logs:**
```bash
npm run dev
# Watch terminal for detailed error stack traces
```

---

## ✨ Success Criteria

You'll know the implementation works when:

✅ **Meetings**
- Can schedule one-time meetings
- Can schedule recurring meetings  
- Participants selected individually or by filter
- Data persists to database
- Page refreshes showing new meetings

✅ **Review Cycles**
- Can create cycles with all types
- Deadlines save correctly
- Privacy settings work
- Participants generated automatically
- Status starts as DRAFT

✅ **UX**
- Dialogs open/close smoothly
- Validation prevents bad submissions
- Loading states show during save
- Success messages confirm actions
- Forms reset after submission

✅ **Performance**
- Filters update instantly
- No lag with 100+ employees
- API responses under 500ms

---

## 📝 Test Data Setup

If you need test data, run these scripts:

### Create Test Employees
```sql
-- Add some test employees if needed
INSERT INTO "User" (id, email, "firstName", "lastName", role, "companyId", "isActive")
VALUES 
  ('test-emp-1', 'john.doe@test.com', 'John', 'Doe', 'EMPLOYEE', 'your-company-id', true),
  ('test-emp-2', 'jane.smith@test.com', 'Jane', 'Smith', 'EMPLOYEE', 'your-company-id', true),
  ('test-emp-3', 'bob.jones@test.com', 'Bob', 'Jones', 'MANAGER', 'your-company-id', true);
```

### Create Test Department
```sql
INSERT INTO "Department" (id, name, "companyId")
VALUES ('test-dept-1', 'Engineering', 'your-company-id');

-- Link employees
UPDATE "User" SET "departmentId" = 'test-dept-1' WHERE id IN ('test-emp-1', 'test-emp-2');
```

---

## 🎯 Next Steps After Testing

Once core functionality is verified:

1. **Implement Email Notifications**
   - Create meeting invite endpoint
   - Create review cycle notification endpoint
   - Add email templates

2. **Add Meeting Details Pages**
   - View scheduled meetings
   - Edit meeting details
   - Cancel/reschedule meetings

3. **Add Review Cycle Dashboard**
   - Track completion progress
   - View participant status
   - Send reminders

4. **Enhance Recurrence**
   - Background job to generate instances
   - Skip holidays logic
   - Edit single vs all in series

5. **Add Analytics**
   - Meeting attendance rates
   - Review completion metrics
   - Performance trends

---

## 📞 Support

If you encounter issues:

1. **Check Console** - Browser DevTools (F12)
2. **Check Server Logs** - Terminal running `npm run dev`
3. **Check Database** - Verify data with SQL queries
4. **Check Network** - DevTools Network tab for API calls

**Common Fix:** Clear browser cache and restart dev server

---

**Ready to test!** 🚀

Start with basic meeting creation, then progress to advanced features like filtering and recurring patterns.
