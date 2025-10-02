# 🔧 AI Assistant - Administrator Guide

**Technical configuration and administration**

---

## 📋 Table of Contents

1. [Setup & Configuration](#setup--configuration)
2. [Architecture Overview](#architecture-overview)
3. [Supported Operations](#supported-operations)
4. [Security & Permissions](#security--permissions)
5. [Monitoring & Limits](#monitoring--limits)
6. [Troubleshooting](#troubleshooting)
7. [API Integration](#api-integration)

---

## 🔧 Setup & Configuration

### **Environment Variables**

Required in `.env.local` or Vercel environment:

```bash
# OpenAI Configuration (REQUIRED)
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_MODEL=gpt-4-turbo-preview  # Optional, default shown
OPENAI_TEMPERATURE=0.7            # Optional, default shown

# Development Options
DISABLE_AI_RATE_LIMIT=true        # Optional: Skip rate limits locally
```

### **Getting OpenAI API Key**

1. Go to https://platform.openai.com/api-keys
2. Create new project key
3. Add billing information
4. Copy key to environment variables
5. Set up billing alerts (recommended)

### **Initial Setup**

```bash
# Local Development
npm run dev

# Production (Vercel)
# Add env vars in Vercel dashboard
# Deploy will automatically use them
```

---

## 🏗️ Architecture Overview

### **Component Structure**

```
app/
├── (withSidebar)/
│   └── assistant/
│       └── page.tsx              # Main UI
├── api/
│   └── ai/
│       └── chat/
│           └── route.ts          # Main endpoint
└── lib/
    └── ai/
        ├── openai-client.ts      # OpenAI config & rate limiting
        ├── orchestrator.ts       # Intent routing & coordination
        ├── conversation-memory.ts # Context management
        ├── system-context.ts     # Company data access
        ├── action-executor.ts    # Action execution & audit
        ├── query-generator.ts    # Database query generation
        ├── workflow-generator.ts # Workflow creation
        ├── field-generator.ts    # Custom field creation
        └── interpreters/
            └── intent-classifier.ts # Intent detection
```

### **Request Flow**

```
User Message
    ↓
Frontend (page.tsx)
    ↓
API Route (/api/ai/chat)
    ↓
Rate Limit Check
    ↓
Orchestrator
    ↓
Intent Classifier (OpenAI)
    ↓
Route to Handler:
    ├── Query Generator → Prisma Query → Result
    ├── Action Executor → Update DB → Audit Log
    ├── Workflow Generator → ReactFlow Definition
    └── Field Generator → FormDataRecord Creation
    ↓
Response with Suggestions
    ↓
Frontend Display
```

---

## ⚙️ Supported Operations

### **1. Data Queries**

**Implementation:** `query-generator.ts`

- Converts natural language to Prisma queries
- Supports: count, findMany, aggregate
- Models: Employee, User, LeaveRequest, Department, etc.
- Automatic company scoping
- SQL injection prevention

**Example Flow:**
```typescript
"How many in Sales?"
    ↓
AI generates: prisma.employee.count({ 
  where: { 
    companyId,
    Department: { name: { contains: "Sales" } } 
  }
})
    ↓
Executes safely
    ↓
Returns: "15 people"
```

### **2. Employee Updates**

**Implementation:** `action-executor.ts`

**Supported Fields:**
- Personal: firstName, lastName
- Contact: email, phone
- Employment: startDate, contractEndDate, contractType, employmentType
- Compensation: salaryAmount, hourlyRate
- Tax: irdNumber, taxCode, kiwiSaverEnrolled, kiwiSaverContribution
- Other: bankAccountNumber, siteLocation, noticePeriodDays, isActive

**Audit Compliance:**
```typescript
// Automatic audit log creation
await createAuditLogs({
  companyId,
  employeeId,
  section: "personal", // or "contact", "tax", etc.
  diffs: [{ field, oldValue, newValue }],
  reasons: { [field]: reason },
  changedById: userId,
});
```

**Undo Mechanism:**
- In-memory store (48-hour TTL)
- Production: Consider Redis or database storage

### **3. Leave Booking**

**Implementation:** `action-executor.ts` → `handleBookLeave()`

**Features:**
- Multi-turn conversation
- Auto-approval (admin bookings)
- Calendar integration (via LeaveRequest model)
- Email notifications
- Leave balance updates

**Process:**
1. Find employee
2. Get dates (with conversation)
3. Select leave type
4. Preview & confirm
5. Create approved LeaveRequest
6. Send email via `sendLeaveNotification()`

### **4. Workflow Creation**

**Implementation:** `workflow-generator.ts`

**Generates:**
- ReactFlow node/edge definitions
- Trigger configurations
- Action types (12 available)
- Condition types (14 available)
- Compatible with existing WorkflowCanvas

**Available Actions:**
- send_email, create_task, update_employee
- send_notification, assign_buddy, create_training
- schedule_performance_review, etc.

### **5. Custom Fields**

**Implementation:** `field-generator.ts`

**Uses:**
- FormDataRecord model (JSON storage)
- No database migrations needed
- Compatible with existing form system

---

## 🔐 Security & Permissions

### **Access Control**

**Current Implementation:**
```typescript
// app/api/ai/chat/route.ts
if (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN") {
  return NextResponse.json(
    { error: "AI features require admin access" },
    { status: 403 }
  );
}
```

**To Extend:**
```typescript
// Add granular permissions
const allowedRoles = ["ADMIN", "SUPER_ADMIN", "HR_MANAGER"];
if (!allowedRoles.includes(session.user.role)) {
  // Deny access
}

// Or capability-based
const capabilities = getUserAICapabilities(session.user);
if (!capabilities.includes("update_employees")) {
  // Deny specific action
}
```

### **Data Scoping**

All queries automatically scoped to user's company:

```typescript
// Automatic in system-context.ts
where: { companyId: session.user.companyId }
```

### **API Key Security**

- ✅ Never exposed to client
- ✅ Server-side only
- ✅ Environment variables
- ✅ Not logged or tracked

### **Audit Trail**

Every action creates:
```typescript
{
  companyId: string,
  employeeId: string,
  section: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  reason: string,
  changedById: string,
  changedAt: DateTime
}
```

---

## 📊 Monitoring & Limits

### **Rate Limiting**

**Current Configuration:**
```typescript
// app/lib/ai/openai-client.ts
checkRateLimit(userId, 500, 3600000)
// 500 requests per hour per user
```

**To Adjust:**
```typescript
// In app/api/ai/chat/route.ts
const rateLimit = checkRateLimit(
  session.user.id,
  1000,      // requests
  3600000    // time window (1 hour in ms)
);
```

**Disable for Testing:**
```bash
# .env.local
DISABLE_AI_RATE_LIMIT=true
```

### **Cost Management**

**OpenAI API Costs (GPT-4 Turbo):**
- Input: ~$0.01 per 1K tokens
- Output: ~$0.03 per 1K tokens
- Average request: $0.01-0.03
- 500 requests/hour: ~$5-15/hour max

**Recommendations:**
1. Set billing limits in OpenAI dashboard
2. Monitor usage at https://platform.openai.com/usage
3. Set up billing alerts
4. Consider GPT-3.5-turbo for lower costs

**Switch Models:**
```bash
# .env.local
OPENAI_MODEL=gpt-3.5-turbo  # Cheaper, less capable
OPENAI_MODEL=gpt-4-turbo-preview  # Current default
OPENAI_MODEL=gpt-4  # More expensive
```

### **Logging**

**Current Logs:**
```typescript
console.log("[AI Orchestrator] Intent:", intent);
console.log("[Action Executor] Executing:", action);
console.error("[OpenAI Error]", error);
```

**Production Monitoring:**
Consider adding:
- Structured logging (Winston, Pino)
- Error tracking (Sentry)
- Analytics (Mixpanel, Amplitude)
- OpenAI usage tracking

---

## 🐛 Troubleshooting

### **Common Issues**

#### **1. "AI features not enabled"**

**Error:**
```json
{
  "error": "AI features not enabled",
  "message": "🔑 AI features haven't been set up yet..."
}
```

**Solution:**
```bash
# Check environment variable
echo $OPENAI_API_KEY

# Set if missing
OPENAI_API_KEY=sk-proj-your-key-here

# Restart server
npm run dev
```

#### **2. Rate Limit Exceeded**

**Error:**
```json
{
  "error": "Rate limit exceeded",
  "message": "🕐 You're using AI Assistant really well! We've hit the hourly limit..."
}
```

**Solutions:**
- Wait for reset (shown in error message)
- Increase limit in `app/api/ai/chat/route.ts`
- Disable for dev: `DISABLE_AI_RATE_LIMIT=true`

#### **3. OpenAI Billing Issues**

**Error:**
```
💳 OpenAI billing limit reached. Please add credits...
```

**Solution:**
1. Go to https://platform.openai.com/account/billing
2. Add payment method
3. Add credits or set up auto-reload
4. Check usage limits

#### **4. Intent Classification Failures**

**Symptom:** AI doesn't understand requests

**Solutions:**
- Rephrase question
- Be more specific
- Check logs for OpenAI errors
- Verify API key has sufficient quota

#### **5. Database Update Failures**

**Error:** Audit log or update fails

**Check:**
```typescript
// Verify Prisma connection
await prisma.$connect();

// Check user has companyId
console.log(session.user.companyId);

// Verify employee exists
const employee = await prisma.employee.findUnique({
  where: { id: employeeId }
});
```

---

## 🔌 API Integration

### **Main Endpoint**

```typescript
POST /api/ai/chat

Headers:
  - Cookie: next-auth session

Body:
{
  "message": "How many people in Sales?",
  "action": "chat" // or "undo", "clear"
}

Response:
{
  "success": true,
  "message": "**15 people**\n\n_This query counts..._",
  "actionType": "query",
  "result": 15,
  "suggestions": [
    "Show me which departments are affected",
    "Create a workflow to automate this"
  ]
}
```

### **Action Types**

```typescript
type ActionType =
  | "query_data"        // Database queries
  | "update_employee"   // Employee updates
  | "book_leave"        // Leave booking
  | "schedule_report"   // Report scheduling
  | "add_field"         // Custom fields
  | "create_workflow"   // Workflow generation
  | "send_email"        // Email sending
  | "bulk_update"       // Bulk operations
  | "modify_settings";  // System settings
```

### **Undo Action**

```typescript
POST /api/ai/chat

Body:
{
  "action": "undo",
  "undoId": "undo-1234567890-abc"
}

Response:
{
  "success": true,
  "message": "✅ Change undone successfully!"
}
```

### **Clear Conversation**

```typescript
POST /api/ai/chat

Body:
{
  "action": "clear"
}

Response:
{
  "success": true,
  "message": "Conversation cleared!"
}
```

---

## 📈 Performance Optimization

### **Caching Strategies**

**System Context:**
```typescript
// Consider caching company data
const companyCache = new Map<string, SystemContext>();

// Cache for 5 minutes
const getCachedContext = (companyId: string) => {
  const cached = companyCache.get(companyId);
  if (cached && Date.now() - cached.timestamp < 300000) {
    return cached.data;
  }
  return null;
};
```

**Rate Limit Store:**
```typescript
// Current: In-memory Map
// Production: Use Redis
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});
```

### **Query Optimization**

```typescript
// Use select to limit data
const employees = await prisma.employee.findMany({
  where: { companyId },
  select: {
    id: true,
    User: {
      select: { firstName: true, lastName: true, email: true }
    },
    Department: {
      select: { name: true }
    }
  },
  take: 100 // Limit results
});
```

---

## 🔄 Future Enhancements

### **Planned Features**

1. **Streaming Responses**
   ```typescript
   // Real-time response streaming
   const stream = await openai.chat.completions.create({
     ...config,
     stream: true
   });
   ```

2. **Voice Input**
   - Whisper API integration
   - Speech-to-text

3. **Advanced Analytics**
   - Predictive models
   - Trend analysis

4. **Mobile App Integration**
   - Native mobile AI interface
   - Push notifications

### **Extensibility**

**Add New Actions:**

1. Define action type in `action-executor.ts`
2. Add handler function
3. Update intent classifier prompt
4. Add to UI capabilities list

**Example:**
```typescript
// Add performance review scheduling
async function handleScheduleReview(action: AIAction) {
  // Implementation
}

// Add to switch statement
case "schedule_review":
  return await handleScheduleReview(action);
```

---

## 📞 Support & Resources

### **Documentation**
- `AI_ASSISTANT_CAPABILITIES.md` - Full user guide
- `AI_ASSISTANT_QUICK_REFERENCE.md` - Quick ref card
- `AI_READY_TO_DEPLOY.md` - Deployment summary
- `AI_ASSISTANT_IMPLEMENTATION.md` - Technical details

### **External Resources**
- [OpenAI API Docs](https://platform.openai.com/docs)
- [GPT-4 Best Practices](https://platform.openai.com/docs/guides/gpt-best-practices)
- [Prisma Docs](https://www.prisma.io/docs)

### **Monitoring**
- OpenAI Dashboard: https://platform.openai.com/usage
- Error Logs: Check application logs
- Audit Trail: `EmployeeAuditLog` table

---

**Document Version:** 1.0  
**Last Updated:** October 2024  
**Maintainer:** Development Team

