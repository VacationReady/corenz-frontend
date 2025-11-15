# Onboarding Label and Reminder Management

Comprehensive guide for managing onboarding step labels, reminders, and SLAs with multi-tenant support and NZ compliance considerations.

## Overview

This system replaces auto-numbering logic with inline validation, adds SLA and reminder configuration to onboarding steps, integrates with the notification service, implements comprehensive audit logging, and provides UX guidance for admins.

## Key Features

### 1. Label Validation & Uniqueness

**Replaces:** Auto-numbering logic for step titles  
**Provides:** Real-time validation with uniqueness enforcement per tenant template

#### Implementation

```typescript
import { validateStepLabel } from '@/lib/onboarding/label-validation';

// Validate a step label
const result = validateStepLabel(
  'Upload Visa Documents',
  currentStepId,
  allSteps,
  tenantId
);

if (!result.isValid) {
  console.error(result.error);
  if (result.suggestion) {
    console.log(`Try: ${result.suggestion}`);
  }
}
```

#### Validation Rules

- **Minimum length:** 3 characters
- **Maximum length:** 80 characters
- **Uniqueness:** Case-insensitive, per template
- **Real-time feedback:** Immediate validation on input
- **Smart suggestions:** Auto-generated alternatives for duplicates

#### Localization Support

```typescript
import { getValidationMessage } from '@/lib/onboarding/label-validation';

// Get localized error message
const errorMsg = getValidationMessage('duplicate', 'mi', {
  suggestion: 'Upload Visa Documents 2',
});
```

Supported locales:
- **en** (English - default)
- **mi** (Te Reo Māori)

### 2. Reminder Configuration

**Features:**
- Multi-day advance reminders
- NZ timezone-aware scheduling
- Escalation paths (manager, HR admin, custom)
- Public holiday and weekend awareness
- Tenant-specific branding support

#### UI Component

```tsx
import { ReminderConfigPanel } from '@/components/onboarding/ReminderConfigPanel';

<ReminderConfigPanel
  value={reminderConfig}
  onChange={(config) => setReminderConfig(config)}
  availableManagers={managers}
  availableHRAdmins={hrAdmins}
/>
```

#### Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable/disable reminders |
| `daysBefore` | number | Days before due date (0-30) |
| `time` | string | Time in HH:MM format (NZ timezone) |
| `escalation.enabled` | boolean | Enable escalation |
| `escalation.days` | number | Days after reminder to escalate (1-14) |
| `escalation.role` | string | 'manager' \| 'hr_admin' \| 'custom' |
| `escalation.userId` | string | User ID for custom escalation |

#### Programmatic Usage

```typescript
import { scheduleStepReminder } from '@/lib/onboarding/reminder-service';

// Schedule a reminder
await scheduleStepReminder({
  companyId: 'company_123',
  onboardingInstanceId: 'instance_456',
  stepInstanceId: 'step_inst_789',
  stepId: 'step_abc',
  employeeId: 'emp_xyz',
  reminderType: 'initial',
  scheduledFor: new Date('2025-01-20T09:00:00Z'),
  recipientEmail: 'employee@example.com',
  recipientName: 'John Doe',
});
```

### 3. SLA Configuration

**Features:**
- Completion targets and warning thresholds
- Business day calculations
- NZ public holiday exclusions
- Weekend exclusions
- Compliance tracking

#### UI Component

```tsx
import { SLAConfigPanel } from '@/components/onboarding/SLAConfigPanel';

<SLAConfigPanel
  value={slaConfig}
  onChange={(config) => setSlaConfig(config)}
/>
```

#### Configuration Options

| Field | Type | Description |
|-------|------|-------------|
| `enabled` | boolean | Enable/disable SLA tracking |
| `completionDays` | number | Target completion days (1-90) |
| `warningDays` | number | Warning threshold days |
| `excludePublicHolidays` | boolean | Exclude NZ public holidays |
| `excludeWeekends` | boolean | Exclude weekends |

#### Business Day Calculation

```typescript
import { calculateBusinessDays, getNZPublicHolidays } from '@/lib/onboarding/reminder-types';

const startDate = new Date('2025-01-15');
const publicHolidays = getNZPublicHolidays(2025);

// Calculate 5 business days excluding weekends and holidays
const dueDate = calculateBusinessDays(
  startDate,
  5,
  true, // excludeWeekends
  true, // excludePublicHolidays
  publicHolidays
);
```

### 4. Notification Service Integration

#### Email Notifications

The system integrates with the Resend email service and respects tenant-specific branding:

```typescript
import { sendStepReminderEmail } from '@/lib/onboarding/reminder-service';

await sendStepReminderEmail(
  {
    employeeName: 'Jane Smith',
    employeeEmail: 'jane@example.com',
    stepTitle: 'Upload Tax Forms',
    stepDescription: 'Please upload IR330 and IR348',
    dueDate: new Date('2025-01-25'),
    onboardingUrl: 'https://app.example.com/onboarding',
    companyName: 'Acme Corp',
  },
  {
    enabled: true,
    logoUrl: 'https://cdn.example.com/logo.png',
    primaryColor: '#3B82F6',
    emailFooterText: 'Custom footer text',
  }
);
```

#### Branding Configuration

Email notifications automatically use:
- Tenant logo
- Primary brand color
- Custom email footer
- Tenant-specific sender domain
- Unsubscribe preferences (respects user settings)

#### Cron Job Processing

Create a cron job to process pending reminders:

```typescript
// app/api/cron/process-onboarding-reminders/route.ts
import { processPendingReminders } from '@/lib/onboarding/reminder-service';

export async function GET() {
  const results = await processPendingReminders(50);
  return Response.json(results);
}
```

Add to `vercel.json` or equivalent:

```json
{
  "crons": [{
    "path": "/api/cron/process-onboarding-reminders",
    "schedule": "*/15 * * * *"
  }]
}
```

### 5. Audit Logging

All label and reminder changes are automatically logged for compliance reporting.

#### Automatic Logging

```typescript
import { logStepChange } from '@/lib/onboarding/audit-logger';

// Log a label change
await logStepChange({
  companyId: 'company_123',
  templateId: 'template_456',
  stepId: 'step_789',
  stepLabel: 'Upload Documents',
  changeType: 'label_change',
  fieldName: 'title',
  oldValue: 'Upload Files',
  newValue: 'Upload Documents',
  changedById: 'user_abc',
  reason: 'Clarification for new hires',
  ipAddress: '192.168.1.1',
});
```

#### Change Types

- **`label_change`**: Step title/label modifications
- **`reminder_config`**: Reminder setting changes
- **`sla_config`**: SLA configuration changes
- **`metadata_change`**: Step metadata modifications

#### Compliance Reports

```typescript
import { generateComplianceReport } from '@/lib/onboarding/audit-logger';

const report = await generateComplianceReport(
  'template_456',
  new Date('2025-01-01'),
  new Date('2025-01-31')
);

console.log(report.summary);
// {
//   totalChanges: 45,
//   labelChanges: 12,
//   reminderChanges: 18,
//   slaChanges: 10,
//   metadataChanges: 5,
//   uniqueSteps: 8,
//   uniqueChangers: 3
// }
```

#### Retrieve Audit Logs

```typescript
import { getTemplateLabelAuditLogs } from '@/lib/onboarding/audit-logger';

const logs = await getTemplateLabelAuditLogs('template_456', {
  changeType: 'reminder_config',
  startDate: new Date('2025-01-01'),
  endDate: new Date('2025-01-31'),
  limit: 50,
});
```

## NZ Onboarding Best Practices

### Critical Compliance Steps

| Step Type | Recommended SLA | Reminder Timing | Public Holiday Exclusion |
|-----------|----------------|-----------------|--------------------------|
| Visa/Work Permit Upload | 3-5 business days | 1 day before | ✅ Required |
| Tax Forms (IR330, IR348) | 5-7 business days | 2 days before | ✅ Required |
| Health & Safety Acknowledgment | 1-2 business days | 1 day before | ✅ Required |
| Employment Agreement Signing | 7-10 business days | 3 days before | ✅ Required |
| KiwiSaver Enrollment | 7 business days | 2 days before | ✅ Required |
| Bank Details | 5 business days | 1 day before | ⚠️ Recommended |
| Emergency Contact Info | 3 business days | 1 day before | ❌ Not Required |

### Escalation Guidelines

- **Critical compliance items:** Escalate to HR admin after 3 days
- **Administrative tasks:** Escalate to manager after 5 days
- **Optional steps:** No escalation needed

### Public Holidays

The system automatically recognizes NZ public holidays:
- New Year's Day & Day after
- Waitangi Day
- Good Friday & Easter Monday
- ANZAC Day
- Queen's Birthday
- Matariki
- Christmas Day & Boxing Day

Regional holidays (e.g., Wellington Anniversary Day) should be configured per tenant.

## Multi-Tenant Considerations

### Shared Services

For organizations managing multiple subsidiaries:

1. **Label Uniqueness:** Scoped per template, not globally
2. **Reminder Branding:** Uses tenant-specific configuration
3. **SLA Calculations:** Respects tenant's public holiday calendar
4. **Escalation:** Can escalate to parent organization HR if needed

### Configuration Example

```typescript
// Step configuration for multi-tenant template
{
  title: "Upload Work Visa",
  reminder: {
    enabled: true,
    daysBefore: 2,
    time: "09:00",
    escalation: {
      enabled: true,
      days: 3,
      role: "hr_admin" // Escalates to tenant's HR admin
    }
  },
  sla: {
    enabled: true,
    completionDays: 5,
    warningDays: 2,
    excludePublicHolidays: true,
    excludeWeekends: true
  },
  metadata: {
    tenantScope: ["subsidiary_a", "subsidiary_b"], // Multi-tenant scope
    complianceLevel: "critical"
  }
}
```

## API Integration

### Creating Onboarding Instance with Reminders

```typescript
import { createRemindersForOnboardingInstance } from '@/lib/onboarding/reminder-service';

// After creating onboarding instance
const instance = await prisma.onboardingInstance.create({
  data: { /* ... */ }
});

// Automatically create all reminders based on step configuration
const reminders = await createRemindersForOnboardingInstance(instance.id);
```

### Canceling Reminders on Completion

```typescript
import { cancelStepReminders } from '@/lib/onboarding/reminder-service';

// When step is completed
await prisma.onboardingStepInstance.update({
  where: { id: stepInstanceId },
  data: { status: 'completed', completedAt: new Date() }
});

// Cancel pending reminders
await cancelStepReminders(stepInstanceId);
```

## Testing

### Unit Tests

```typescript
import { validateStepLabel } from '@/lib/onboarding/label-validation';

describe('Label Validation', () => {
  it('should reject duplicate labels', () => {
    const result = validateStepLabel(
      'Upload Documents',
      'step_1',
      [{ id: 'step_2', title: 'Upload Documents' }],
      'tenant_1'
    );
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('already in use');
  });
});
```

### Integration Tests

```typescript
import { processPendingReminders } from '@/lib/onboarding/reminder-service';

describe('Reminder Processing', () => {
  it('should process pending reminders', async () => {
    // Create test reminder
    await scheduleStepReminder({/* ... */});
    
    // Process reminders
    const results = await processPendingReminders();
    
    expect(results.sent).toBeGreaterThan(0);
  });
});
```

## Migration Guide

### Step 1: Run Database Migration

```bash
npx prisma migrate dev --name add_onboarding_reminders_sla
```

### Step 2: Regenerate Prisma Client

```bash
npx prisma generate
```

### Step 3: Update Existing Templates

```typescript
// Migration script to add default configs to existing steps
import { prisma } from '@/app/lib/prisma';

async function migrateExistingSteps() {
  const steps = await prisma.onboardingStep.findMany();
  
  for (const step of steps) {
    await prisma.onboardingStep.update({
      where: { id: step.id },
      data: {
        reminderEnabled: false,
        slaEnabled: false,
        excludePublicHolidays: true,
        excludeWeekends: false,
      },
    });
  }
}
```

### Step 4: Set Up Cron Job

Configure your deployment platform to run the reminder processing cron job every 15 minutes.

## Troubleshooting

### Reminders Not Sending

1. Check Resend API key is configured
2. Verify cron job is running
3. Check reminder status in database: `SELECT * FROM "OnboardingReminder" WHERE status = 'failed'`
4. Review error logs for failed reminders

### SLA Calculations Incorrect

1. Verify public holiday calendar is up to date
2. Check `excludePublicHolidays` and `excludeWeekends` settings
3. Ensure timezone is correctly set to Pacific/Auckland

### Audit Logs Missing

1. Verify audit logging is called in update functions
2. Check database permissions for `OnboardingStepAuditLog` table
3. Review error logs for failed audit writes

## Support

For questions or issues:
- Review this documentation
- Check audit logs for change history
- Contact HR platform support team
- Review NZ compliance guidelines at Employment New Zealand website

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Compliance:** New Zealand Employment Relations Act 2000, Holidays Act 2003
