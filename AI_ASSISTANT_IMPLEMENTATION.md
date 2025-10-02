# 🤖 AI Assistant Implementation Guide

## Overview

The AI Assistant enables natural language interaction with your HR system, allowing admins to:
- **Query data** without writing SQL
- **Generate workflows** from plain English
- **Add custom fields** without database migrations

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install openai@^4.77.3
```

### 2. Set Environment Variables
Add to your `.env.local` file:

```env
# Required
OPENAI_API_KEY=sk-proj-...

# Optional (defaults shown)
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_TEMPERATURE=0.7
AI_RATE_LIMIT_REQUESTS=100
AI_RATE_LIMIT_WINDOW=3600000
```

### 3. Get Your OpenAI API Key
1. Go to https://platform.openai.com/api-keys
2. Create new secret key
3. Copy and add to `.env.local`

### 4. Start the Server
```bash
npm run dev
```

### 5. Access AI Assistant
Navigate to: **Dashboard** → Click **AI Chatbot** button
Or go directly to: `/assistant`

---

## 🎯 Features

### Tier 1: Instant Actions (No Approval)

#### 📊 Data Queries
Ask natural language questions about your data:

**Examples:**
- "How many employees don't have IRD numbers?"
- "Show me employees starting in the next 30 days"
- "Which departments have the most leave requests?"
- "List employees with contracts expiring this quarter"
- "What's the average salary by department?"
- "Who hasn't completed their onboarding forms?"

**How it works:**
1. AI converts your question to a safe Prisma query
2. Executes read-only query scoped to your company
3. Returns results with explanation

**Safety:**
- ✅ Read-only queries only
- ✅ Always filtered by companyId
- ✅ Rate limited (100 requests/hour)
- ✅ Admin only access

---

#### ⚡ Workflow Generation
Describe a workflow and AI builds it:

**Examples:**
- "Send a reminder to managers 5 days before probation ends"
- "Alert HR when a contract expires in 60 days"
- "Welcome new Engineering hires with IT setup form"
- "Notify manager when employee leave balance is low"
- "Create review task for employees after 90 days"
- "Send birthday wishes to employees"

**How it works:**
1. AI analyzes your description
2. Generates workflow nodes (triggers, actions, conditions)
3. Creates visual ReactFlow diagram
4. You review and save

**Output:**
- Visual workflow canvas (editable)
- Nodes with proper connections
- Real action/condition types from your system
- Saved as inactive automation rule (activate in Settings)

---

#### ➕ Custom Fields
Add fields to employee forms without coding:

**Examples:**
- "Add a 'Favourite Colour' field to personal information"
- "Create a 'Shirt Size' dropdown with options S, M, L, XL"
- "Add a 'Dietary Requirements' text area"
- "Add a 'LinkedIn Profile' URL field"

**How it works:**
1. AI determines appropriate field type (text, select, date, etc.)
2. Generates field definition with validation
3. Adds to specified form (or creates "Custom Fields" form)
4. Data stored in FormDataRecord JSON (no migration needed)

**Where fields appear:**
- Personal Information screen
- Bank & Payroll screen
- Emergency Contacts screen
- Custom Fields form (if created)

---

### Tier 2: Preview Required

**Bulk Updates** (not yet implemented)
- Preview changes before applying
- Shows affected records
- Requires confirmation

---

### Tier 3: Blocked (Never Allowed)

For safety, these are NOT accessible via AI:
- ❌ Database schema migrations (ALTER TABLE)
- ❌ Delete operations without explicit confirmation
- ❌ Authentication/permission changes
- ❌ Critical system setting modifications

---

## 🏗️ Architecture

### File Structure

```
app/
├── lib/ai/
│   ├── openai-client.ts        # OpenAI setup & rate limiting
│   ├── query-generator.ts      # Natural language → Prisma queries
│   ├── workflow-generator.ts   # Workflow creation from prompts
│   └── field-generator.ts      # Custom field generation
├── api/ai/
│   ├── query/route.ts          # Data query endpoint
│   ├── workflow/route.ts       # Workflow generation endpoint
│   └── field/route.ts          # Custom field endpoint
└── (withSidebar)/assistant/
    └── page.tsx                # Main AI Assistant UI
```

### API Endpoints

#### POST /api/ai/query
Query database with natural language

**Request:**
```json
{
  "query": "How many employees don't have IRD numbers?"
}
```

**Response:**
```json
{
  "success": true,
  "count": 12,
  "explanation": "Found 12 employees without IRD numbers",
  "query": "employeesWithoutIRD"
}
```

---

#### POST /api/ai/workflow
Generate workflows

**Request:**
```json
{
  "action": "generate",
  "prompt": "Send reminder to managers 5 days before probation ends"
}
```

**Response:**
```json
{
  "success": true,
  "workflow": {
    "name": "Probation End Reminder",
    "description": "Reminds managers before probation period ends",
    "nodes": [...],
    "edges": [...]
  },
  "explanation": "Created workflow with trigger and email action"
}
```

**Actions:**
- `generate` - Create new workflow
- `refine` - Modify existing workflow
- `explain` - Get plain English explanation
- `save` - Save to automation rules

---

#### POST /api/ai/field
Add custom fields

**Request:**
```json
{
  "action": "generate",
  "description": "Favourite Colour dropdown",
  "section": "personal-information"
}
```

**Response:**
```json
{
  "success": true,
  "field": {
    "id": "custom_123...",
    "label": "Favourite Colour",
    "type": "select",
    "options": [
      {"value": "red", "label": "Red"},
      {"value": "blue", "label": "Blue"},
      ...
    ]
  },
  "formId": "form-personal-info",
  "message": "Added 'Favourite Colour' to Personal Information"
}
```

---

## 🔒 Security

### Authentication & Authorization
- ✅ Requires valid session
- ✅ Admin/Super Admin only
- ✅ All queries scoped to user's companyId
- ✅ No access to other tenants' data

### Rate Limiting
- ✅ 100 requests per hour per user (configurable)
- ✅ In-memory tracking (use Redis in production)
- ✅ Returns 429 when exceeded

### Query Safety
- ✅ Read-only operations only
- ✅ No UPDATE, DELETE, INSERT
- ✅ All queries filtered by companyId
- ✅ Result size limited (100 records max)

### Workflow Safety
- ✅ Generated workflows start disabled
- ✅ Must be reviewed before activation
- ✅ Validates node structure before save
- ✅ Uses real action/condition types only

### Field Safety
- ✅ Stores in JSON (no schema changes)
- ✅ Validates field definitions
- ✅ Scoped to company forms
- ✅ Marked as custom (can be removed)

---

## 💡 Usage Examples

### Example 1: Data Investigation
**User:** "How many employees don't have IRD numbers?"

**AI Response:**
```
Found 12 employees without IRD numbers

Result: 12
```

**User:** "Show me their names"

**AI Response:**
```
Found 12 employees:
1. John Doe - Sales Department
2. Jane Smith - Engineering
... (showing first 100)
```

---

### Example 2: Workflow Creation
**User:** "Create a workflow that emails HR 30 days before visas expire"

**AI Response:**
```
✅ Workflow Generated!

Visa Expiry Alert (30 Days)

This workflow triggers 30 days before a visa expires and sends
an email to HR with the employee details.

I've created a visual workflow on the right. Review it and click
"Save Workflow" when ready.
```

*Shows visual workflow in right panel with editable nodes*

---

### Example 3: Custom Fields
**User:** "Add a 'T-Shirt Size' dropdown to personal info with options S, M, L, XL, XXL"

**AI Response:**
```
✅ Field Created!

Added "T-Shirt Size" to Personal Information

Field Details:
- Label: T-Shirt Size
- Type: select
- Options: S, M, L, XL, XXL
- Form: personal-information

You can find it in the employee's personal information screen.
```

---

## 🧪 Testing

### Test the Installation

1. **Check API key:**
```bash
# In terminal
echo $OPENAI_API_KEY
# Should output: sk-proj-...
```

2. **Test query endpoint:**
```bash
curl -X POST http://localhost:3000/api/ai/query \
  -H "Content-Type: application/json" \
  -d '{"query": "How many active employees?"}'
```

3. **Test in UI:**
- Navigate to `/assistant`
- Try: "How many employees don't have IRD numbers?"
- Should see response with count

---

## 📊 Monitoring

### Rate Limits
Check current usage (add this to your admin dashboard):
```typescript
const rateLimit = checkRateLimit(userId, 100, 3600000);
console.log(`Remaining: ${rateLimit.remaining} requests`);
```

### Cost Tracking
OpenAI costs by token usage:
- GPT-4 Turbo: ~$0.01-0.03 per request
- Typical query: 500-1000 tokens
- 100 requests ≈ $1-3

**Cost optimization:**
- Use lower temperature for queries (0.3)
- Cache common queries
- Use gpt-3.5-turbo for simple tasks

---

## 🐛 Troubleshooting

### "AI features not enabled"
**Fix:** Add `OPENAI_API_KEY` to `.env.local`

### "Invalid OPENAI_API_KEY format"
**Fix:** Ensure key starts with `sk-` or `sk-proj-`

### "Rate limit exceeded"
**Fix:** Wait 1 hour or increase `AI_RATE_LIMIT_REQUESTS`

### "Query failed: companyId required"
**Fix:** Ensure user session has valid `companyId`

### Workflow generation fails
**Fix:** Check that action/condition types are loaded:
```typescript
import { actionTypes } from "@/app/(withSidebar)/settings/automation-rules/config/actionTypes";
console.log(actionTypes.length); // Should be 12+
```

---

## 🚀 Production Deployment

### Vercel Environment Variables
Add in Vercel dashboard:
```
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4-turbo-preview
AI_RATE_LIMIT_REQUESTS=100
```

### Production Optimizations

1. **Use Redis for rate limiting:**
```typescript
import { Redis } from "@upstash/redis";
const redis = new Redis({ url: process.env.REDIS_URL });
```

2. **Add logging:**
```typescript
// Log AI requests
await prisma.aiAuditLog.create({
  data: {
    userId: session.user.id,
    action: "query",
    prompt: query,
    tokens: completion.usage.total_tokens,
    cost: calculateCost(completion.usage),
  }
});
```

3. **Cache common queries:**
```typescript
const cacheKey = `ai-query:${hash(query)}`;
const cached = await redis.get(cacheKey);
if (cached) return cached;
```

---

## 📈 Future Enhancements

### Phase 2
- **Bulk operations** with preview
- **Report generation** from prompts
- **Dashboard widgets** created by AI
- **Multi-turn conversations** with context

### Phase 3
- **Voice input** for queries
- **Scheduled insights** (weekly reports)
- **Predictive analytics** (turnover risk)
- **Integration suggestions** (recommend automations)

---

## 💰 Cost Estimates

### Per Request Costs (GPT-4 Turbo)
- Simple query: ~$0.01
- Workflow generation: ~$0.02-0.03
- Field generation: ~$0.01

### Monthly Estimates
- 10 admins × 50 requests/month = 500 requests
- 500 × $0.02 average = **$10/month**

Compare to:
- HR consultant: $150/hour
- Developer time: $100/hour
- Time saved: 5-10 hours/month = **$500-1000 saved**

**ROI: 50-100x**

---

## 🎓 Best Practices

### Writing Good Prompts

**❌ Too vague:**
"Show employees"

**✅ Specific:**
"Show me employees without IRD numbers in the Sales department"

**❌ Too complex:**
"Create workflow that checks if employee is in engineering and has been here more than 90 days and hasn't had a review and send email to manager and HR and create task"

**✅ Clear steps:**
"Create a workflow: When an employee reaches 90 days, check if they're in Engineering, then send their manager a reminder to schedule a review"

---

### Iterative Refinement

Use multi-turn conversations:
1. "Create a contract expiry workflow"
2. *AI generates basic workflow*
3. "Make it send 60 days before instead of 30"
4. *AI updates workflow*
5. "Add a condition for fixed-term contracts only"
6. *AI adds condition node*

---

## 📞 Support

**Documentation:** This file  
**API Docs:** See `/api/ai/*` files  
**Issues:** Check browser console for errors  
**Costs:** Monitor at https://platform.openai.com/usage

---

## ✅ Launch Checklist

Before going live:
- [ ] Set `OPENAI_API_KEY` in production
- [ ] Test with real queries
- [ ] Set appropriate rate limits
- [ ] Review generated workflows before activation
- [ ] Train admins on prompt writing
- [ ] Monitor costs for first week
- [ ] Set up alerts for high usage

---

**Status:** ✅ Ready for deployment  
**Version:** 1.0.0  
**Last Updated:** October 1, 2025  
**Build Status:** TypeScript compiled successfully

