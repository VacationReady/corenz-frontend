# Vercel Cron Setup Complete ✅

## Overview
All automation workflow cron jobs have been configured and standardized for Vercel Cron execution.

## Cron Jobs Configured

### 1. **Process Automations** (`/api/cron/process-automations`)
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Purpose**: Main workflow engine execution
  - Processes scheduled workflows with cron triggers
  - Executes delayed workflow continuations
  - Handles event-based triggers
  - Cleans up old completed jobs
- **Max Duration**: 300 seconds (5 minutes)

### 2. **Send Expiry Alerts** (`/api/cron/send-expiry-alerts`)
- **Schedule**: Daily at 9:00 AM (`0 9 * * *`)
- **Purpose**: Document/training/license expiry notifications
  - Checks for expiring driver licenses
  - Checks for expiring training records
  - Checks for expiring employment checks
  - Sends exit interview form invitations
- **Recipients**: Employees, managers, and admins as configured

### 3. **Shift Reminders** (`/api/cron/shift-reminders`)
- **Schedule**: Every 15 minutes (`0,15,30,45 * * * *`)
- **Purpose**: Push notifications for upcoming shifts
  - Sends reminders 1 hour before shift starts
  - Currently placeholder (ready for shift system integration)

### 4. **Automation Triggers** (`/api/cron/automation-triggers`)
- **Schedule**: Every 10 minutes (`*/10 * * * *`)
- **Purpose**: Evaluates scheduled automation rule triggers
  - Checks for rules that need to be triggered
  - Runs independently from main process-automations job

## Security

All cron endpoints are protected with `CRON_SECRET`:
- Environment variable must be set in Vercel: `CRON_SECRET`
- Vercel automatically adds this to the `Authorization` header when calling cron endpoints
- Standardized authentication helper: `app/lib/cron/auth.ts`

## File Changes

### New Files
- ✅ `app/lib/cron/auth.ts` - Standardized cron authentication helper

### Updated Files
- ✅ `vercel.json` - Added cron configuration array
- ✅ `app/api/cron/process-automations/route.ts` - Standardized auth
- ✅ `app/api/cron/send-expiry-alerts/route.ts` - Added GET handler, standardized auth
- ✅ `app/api/cron/shift-reminders/route.ts` - Standardized auth
- ✅ `app/api/cron/automation-triggers/route.ts` - Standardized auth

## Verification

After deployment, verify cron jobs are running:

1. **Check Vercel Dashboard** → Your Project → Cron Jobs
   - Should show all 4 cron jobs listed
   - Check execution logs for any errors

2. **Test Endpoints Manually** (with CRON_SECRET):
   ```bash
   curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
        https://your-app.vercel.app/api/cron/process-automations
   ```

3. **Monitor Logs** in Vercel Dashboard → Functions → View Logs
   - Look for execution success messages
   - Check for any 401 errors (auth issues)

## Notes

- All cron endpoints support both GET (Vercel Cron) and POST (manual/managed services)
- Development mode allows requests without CRON_SECRET (with warning)
- Production mode requires CRON_SECRET to be set
- The `process-automations` endpoint has extended timeout (5 minutes) for long-running workflows

## Schedule Summary

| Job | Frequency | When |
|-----|-----------|------|
| Process Automations | Every 5 min | Always |
| Automation Triggers | Every 10 min | Always |
| Shift Reminders | Every 15 min | Always |
| Expiry Alerts | Daily | 9:00 AM |

---

**Status**: ✅ Ready for deployment
**Next Steps**: Deploy to Vercel and monitor cron job execution in the dashboard




