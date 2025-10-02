# 🚀 AI Assistant - 5 Minute Setup

## Step 1: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Name it: "PeopleCore HR System"
5. Copy the key (starts with `sk-proj-...`)

**Cost:** Pay-as-you-go, typically $10-20/month for small team

---

## Step 2: Add to Environment Variables

Create or edit `.env.local` in your project root:

```env
# AI Assistant (REQUIRED)
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Optional (defaults work fine)
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_TEMPERATURE=0.7
AI_RATE_LIMIT_REQUESTS=100
AI_RATE_LIMIT_WINDOW=3600000
```

Replace `sk-proj-YOUR_KEY_HERE` with your actual key.

---

## Step 3: Install Dependencies

Already done! ✅ (OpenAI SDK was installed automatically)

---

## Step 4: Start Server

```bash
npm run dev
```

---

## Step 5: Test It Out

1. Go to your dashboard
2. Click the **"AI Chatbot"** button (or navigate to `/assistant`)
3. Try one of these:
   - "How many employees don't have IRD numbers?"
   - "Create a workflow that alerts HR 60 days before contracts expire"
   - "Add a 'Favorite Colour' field to personal information"

---

## ✅ You're Done!

The AI Assistant is now active and ready to use.

### What You Can Do:

📊 **Query Data**
- Ask about employees, leave requests, documents
- Get instant answers without writing SQL
- View results in real-time

⚡ **Generate Workflows**
- Describe automation in plain English
- AI builds the workflow visually
- Review and activate when ready

➕ **Add Custom Fields**
- No database migrations needed
- Fields stored in JSON
- Available immediately

---

## 🔐 Security Notes

- ✅ Admin-only access
- ✅ All queries scoped to your company
- ✅ Read-only data access
- ✅ Rate limited (100 requests/hour)
- ✅ Workflows start disabled (must be reviewed)

---

## 💰 Cost Estimates

**Typical usage:** $10-20/month
- ~500 requests/month
- $0.01-0.03 per request
- GPT-4 Turbo pricing

**Compare to:**
- HR consultant time: $500-1000/month saved
- Developer time: $400-800/month saved

**ROI: 25-50x**

---

## 🐛 Troubleshooting

### Can't see AI Chatbot button?
- Make sure you're logged in as ADMIN
- Check role in top right corner
- EMPLOYEE role doesn't have access

### "AI features not enabled" error?
- Check `.env.local` has `OPENAI_API_KEY`
- Restart dev server (`npm run dev`)
- Verify key starts with `sk-` or `sk-proj-`

### Queries fail with errors?
- Check your OpenAI account has credits
- Verify API key is valid at https://platform.openai.com/api-keys
- Check browser console for detailed error

---

## 📚 Learn More

See `AI_ASSISTANT_IMPLEMENTATION.md` for:
- Full feature documentation
- API endpoints
- Advanced usage
- Production deployment
- Cost optimization

---

## 🎯 Quick Examples

### Example 1: Find Data Issues
**You:** "How many employees don't have IRD numbers?"  
**AI:** "Found 12 employees without IRD numbers"

### Example 2: Create Automation
**You:** "Send reminder to managers 5 days before probation ends"  
**AI:** *Generates visual workflow* "Review and save when ready"

### Example 3: Extend System
**You:** "Add a 'Shirt Size' dropdown to personal info"  
**AI:** "Field created! Available in employee profiles now"

---

**That's it! You're ready to use AI-powered HR automation.** 🎉

