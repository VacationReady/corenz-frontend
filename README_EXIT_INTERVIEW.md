# PeopleCore Exit Interview System

This document describes the enhanced offboarding system with exit interview functionality for PeopleCore.

## Overview

The exit interview system provides:

1. **Enhanced Offboarding Modal** - Schedule exit interviews with time, location, and interviewer details
2. **Exit Interview Form Templates** - Create and manage reusable form templates
3. **Automated Email Notifications** - Send calendar invites and form invitations
4. **Public Form Access** - Employees can complete forms via secure token links
5. **Scheduled Form Delivery** - Send forms at specific times (interview date)
6. **Comprehensive Tracking** - Monitor form completion status and submissions

## Features

### 1. Exit Interview Scheduling

- Date and time picker with Europe/London timezone support
- Interviewer selection (internal users or external contacts)
- Location and notes fields
- Automatic ICS calendar invite generation

### 2. Form Template Management

- Create, edit, and manage exit interview form templates
- Support for various field types: text, textarea, select, checkbox, radio
- Template activation/deactivation
- Usage tracking (number of offboardings and submissions)

### 3. Email Automation

- **Confirmation Emails**: Sent immediately with ICS calendar attachment
- **Form Invitations**: Can be sent immediately or scheduled for interview date
- **Cron Job**: Automated sending of scheduled form invitations

### 4. Public Form Access

- Secure token-based access (`/exit-interview/[token]`)
- No login required for employees
- Form validation and submission tracking
- Success/error handling

### 5. Admin Interface

- Employee offboarding profile page (`/employees/[id]/offboarding`)
- Form template management (`/settings/forms/exit-interview`)
- Real-time status tracking
- Manual email resend functionality

## Database Schema

### New Tables

#### `ExitInterviewFormTemplate`

```sql
- id: String (Primary Key)
- name: String
- description: String (Optional)
- schemaJson: JSON (Form field definitions)
- isActive: Boolean
- createdAt: DateTime
- updatedAt: DateTime
```

#### `ExitInterviewSubmission`

```sql
- id: String (Primary Key)
- offboardingId: String (Foreign Key)
- templateId: String (Foreign Key)
- submittedBy: String (Optional)
- submittedAt: DateTime (Optional)
- answersJson: JSON (Optional)
```

### Enhanced `EmployeeOffboarding` Table

Added fields for exit interview management:

- `exitInterviewDate`: DateTime (UTC)
- `exitInterviewEnd`: DateTime (UTC)
- `interviewerUserId`: String (Optional)
- `interviewerName`: String (Optional)
- `interviewerEmail`: String (Optional)
- `location`: String (Optional)
- `sendForm`: Boolean
- `formTemplateId`: String (Optional)
- `formTiming`: Enum ('NOW', 'ON_DATE')
- `inviteIcsUid`: String (Optional)
- `inviteLastSentAt`: DateTime (Optional)
- `scheduledSendAt`: DateTime (Optional)
- `completionTokenHash`: String (Optional)
- `completionStatus`: Enum ('PENDING', 'STARTED', 'SUBMITTED')

## API Endpoints

### Offboarding Management

- `POST /api/offboarding/initiate` - Create new offboarding with exit interview
- `POST /api/offboarding/send-invites` - Send confirmation emails
- `POST /api/offboarding/schedule-due-sends` - Cron endpoint for scheduled sends
- `GET /api/offboarding/[employeeId]` - Get offboarding details

### Form Templates

- `GET /api/exit-interview-templates` - List templates
- `POST /api/exit-interview-templates` - Create template
- `GET /api/exit-interview-templates/[id]` - Get template details
- `PUT /api/exit-interview-templates/[id]` - Update template
- `DELETE /api/exit-interview-templates/[id]` - Delete template

### Form Submission

- `POST /api/exit-interview/start` - Start form (validate token)
- `POST /api/exit-interview/submit` - Submit form answers

## Setup Instructions

### 1. Environment Variables

Add these to your `.env.local`:

```bash
# Email Configuration
RESEND_API_KEY=your_resend_api_key
FROM_EMAIL=noreply@yourcompany.com

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Cron Configuration (for scheduled sends)
CRON_SECRET=your_secure_cron_secret
```

### 2. Database Migration

Run the migration to create the new tables:

```bash
npx prisma migrate dev --name enhance_exit_interview
```

### 3. Dependencies

Install required packages:

```bash
npm install date-fns-tz
```

### 4. Cron Job Setup

#### Vercel Cron (Recommended)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/offboarding/schedule-due-sends",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

#### Railway Cron

Create a cron job that hits:

```
POST https://your-app.railway.app/api/offboarding/schedule-due-sends
Authorization: Bearer your_cron_secret
```

### 5. Email Templates

The system uses Resend for email delivery. Ensure your Re

send account is configured and the API key is set.

## Usage Guide

### 1. Creating Form Templates

1. Navigate to **Settings → Forms & Surveys → Exit Interview Forms**
2. Click **New Template**
3. Design your form using the form builder
4. Save and activate the template

### 2. Initiating Offboarding

1. Go to **Employees** and find the employee
2. Click the kebab menu and select **Initiate Offboarding**
3. Fill in the exit interview details:
   - Date and time
   - Interviewer (internal or external)
   - Location and notes
4. Optionally enable exit interview form:
   - Select a template
   - Choose timing (Now or On interview date)
5. Submit to create the offboarding record

### 3. Managing Offboarding

1. Navigate to **Employees → [Employee Name] → Offboarding**
2. View all offboarding details
3. Use **Resend Invite** to send calendar confirmation
4. Monitor form completion status

### 4. Employee Form Completion

1. Employee receives email with secure link
2. Clicks link to access form (`/exit-interview/[token]`)
3. Completes and submits form
4. Receives confirmation

## Timezone Handling

- All dates are stored in UTC in the database
- Display is converted to Europe/London timezone
- ICS files are generated in UTC for maximum compatibility
- Cron jobs respect London timezone for scheduled sends

## Security Features

- **Token-based Access**: Secure, single-use tokens for form access
- **Token Expiration**: Tokens are invalidated after form submission
- **RBAC**: Only Admin/Manager users can manage offboarding
- **Input Validation**: All inputs validated with Zod schemas
- **Rate Limiting**: Public endpoints are rate-limited

## Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check Resend API key configuration
   - Verify FROM_EMAIL is set correctly
   - Check email templates in Resend dashboard

2. **Cron job not working**
   - Verify CRON_SECRET environment variable
   - Check Vercel/Railway cron configuration
   - Test endpoint manually with GET request

3. **Timezone issues**
   - Ensure date-fns-tz is installed
   - Verify Europe/London timezone handling
   - Check ICS file generation

4. **Form not loading**
   - Verify token is valid and not expired
   - Check form template is active
   - Review browser console for errors

### Debug Endpoints

- `GET /api/offboarding/schedule-due-sends` - Check scheduled sends without sending
- `GET /api/exit-interview-templates?activeOnly=true` - List active templates

## File Structure

```
app/
├── api/
│   ├── offboarding/
│   │   ├── initiate/route.ts
│   │   ├── send-invites/route.ts
│   │   ├── schedule-due-sends/route.ts
│   │   └── [employeeId]/route.ts
│   ├── exit-interview/
│   │   ├── start/route.ts
│   │   └── submit/route.ts
│   └── exit-interview-templates/
│       ├── route.ts
│       └── [id]/route.ts
├── components/
│   └── employees/
│       └── EnhancedOffboardingModal.tsx
├── lib/
│   ├── time.ts
│   ├── calendar/
│   │   └── ics.ts
│   └── email/
│       └── send.ts
├── (withSidebar)/
│   ├── employees/[id]/offboarding/page.tsx
│   └── settings/forms/exit-interview/page.tsx
└── exit-interview/[token]/page.tsx
```

## Future Enhancements

- PDF generation of completed forms
- Advanced form builder with drag-and-drop
- Integration with HRIS systems
- Analytics and reporting dashboard
- Multi-language support
- Mobile-optimized form interface
