# Timesheet Submission Debugging Guide

## 🚨 CRITICAL: Check the RIGHT Logs

### Server Logs (Backend) - `[Timesheet Submit]` prefix
**These show the ACTUAL submission process on the server:**

#### Local Development:
```bash
# Your terminal running npm run dev should show:
[Timesheet Submit] Timesheet xxx submitted by John Doe
[Timesheet Submit] Found default workflow: workflow-id-xxx
[Timesheet Submit] Creating 1 approval stages
[Timesheet Submit] Stage 1: MANAGER approver emp-xxx (Manager Name)
[Timesheet Submit] Creating action item for user usr-xxx
[Timesheet Submit] Action item created successfully
[Timesheet Submit] Sending emails to 1 approvers
[Timesheet Submit] Sending email to manager@email.com (Manager Name)
[Timesheet Submit] Email sent successfully to manager@email.com
```

#### Vercel Production:
1. Go to https://vercel.com/dashboard
2. Select your project
3. Click "Deployments" tab
4. Click your latest deployment
5. Click "Functions" tab  
6. Look for `/api/timesheets/[id]/submit` logs
7. Expand the function to see console.log output

### Client Logs (Frontend) - `[Client]` prefix
**These show the request being made from your browser:**

Open Browser DevTools → Console tab:
```
[Client] Submitting timesheet: timesheet-id-xxx
[Client] Submit response status: 200
[Client] Submit response data: {...}
```

---

## ✅ What You Should See

### 1. Browser Console (Client-Side)
```
[Client] Submitting timesheet: cm4abc123xyz
[Client] Submit response status: 200
[Client] Submit response data: {timesheet: {...}, success: true}
```

### 2. Server Terminal/Vercel Logs (Server-Side)
```
[Timesheet Submit] Timesheet cm4abc123xyz submitted by John Doe
[Timesheet Submit] Found default workflow: clm123xyz
[Timesheet Submit] Creating 1 approval stages
[Timesheet Submit] Stage 1: MANAGER approver emp-xyz123 (Jane Manager)
[Timesheet Submit] Creating action item for user usr-xyz456
[Timesheet Submit] Action item created successfully
[Timesheet Submit] Sending emails to 1 approvers
[Timesheet Submit] Sending email to jane@company.com (Jane Manager)
[Timesheet Submit] Email sent successfully to jane@company.com: {id: "..."}
```

---

## 🐛 Common Issues & Solutions

### Issue #1: No Server Logs at All
**Symptom:** Browser shows success, but no `[Timesheet Submit]` logs in server terminal

**Causes:**
- ❌ You didn't deploy the updated code
- ❌ Looking at wrong server (old Next.js instance)
- ❌ Looking at wrong Vercel deployment

**Solution:**
1. Confirm you pushed latest code to Git
2. Confirm Vercel deployment succeeded
3. Restart local dev server: `npm run dev`

### Issue #2: "Employee has no manager assigned"
**Symptom:** Server log shows:
```
[Timesheet Submit] Employee John Doe has no manager assigned
```

**Solution:**
1. Go to Employees page
2. Find the employee
3. Edit employment details
4. Set "Manager" field
5. Save and retry

### Issue #3: Email Logs Show "CRITICAL: Failed to send email"
**Symptom:** Server log shows:
```
[Timesheet Submit] CRITICAL: Failed to send email to manager@email.com: {...}
```

**Possible Causes:**
- Missing `RESEND_API_KEY` in environment variables
- Domain not verified in Resend
- Invalid `PEOPLECORE_FROM_EMAIL`

**Solution:**
1. Check `.env.local` has `RESEND_API_KEY=re_...`
2. Verify domain in Resend dashboard
3. Ensure `PEOPLECORE_FROM_EMAIL` uses verified domain

### Issue #4: No Action Items Created
**Symptom:** Email sent but no action items in hub

**Server Log Will Show:**
```
[Timesheet Submit] Could not resolve userId for approver employeeId: emp-xxx
```

**Solution:** Manager user account needs an employee record created

---

## 🔍 Debugging Checklist

1. **[ ]** Check BROWSER console for `[Client]` logs
2. **[ ]** Check SERVER terminal/Vercel for `[Timesheet Submit]` logs  
3. **[ ]** Confirm you deployed the latest code
4. **[ ]** Verify employee has manager assigned
5. **[ ]** Verify manager has employee record
6. **[ ]** Check Resend API key is configured
7. **[ ]** Verify workflow was auto-created (Settings → Multi-Stage Approvals)

---

## 📋 What to Share If Still Broken

**Please provide:**
1. **Browser console output** (copy/paste all `[Client]` logs)
2. **Server logs** (copy/paste all `[Timesheet Submit]` logs)
3. **Screenshot** of employee's manager assignment
4. **Screenshot** of Settings → Multi-Stage Approvals page
5. **Environment confirmation**: Local dev or Vercel production?

This will help identify the exact failure point immediately.
