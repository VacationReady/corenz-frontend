# Test Employee Queries - Quick Verification

## Changes Made
1. Added "mobile number" and "cell phone" examples to training data
2. Added console logging to track AI responses
3. Fixed isActive filter to include User (name) filter check
4. Enhanced error messages with more context

## Test Queries

Try these in the `/assistant` page:

### Basic Phone Lookup
```
What's Alex Ward's mobile number?
```

Expected: Should return Alex Ward's phone number with formatted response

### Alternative Phrasings
```
What's Alex Ward's phone number?
What's Alex Ward's cell phone?
Get Alex Ward's contact number
```

All should work the same way.

### Email Lookup
```
What's Alex Ward's email?
```

### Full Details
```
Show me Alex Ward's details
```

## Debugging

If it still fails, check the console logs for:

1. **`[AI Query Generator] Prompt:`** - Shows what query was sent
2. **`[AI Query Generator] AI Response:`** - Shows what the AI generated
   - Should have: `queryType: "findMany"`, `model: "employee"`
   - Should have operation with: `firstName contains 'Alex' AND lastName contains 'Ward'`
3. **`[Query Executor] Model:`** - Shows what's being executed
   - Should be: `Model: employee QueryType: findMany`

## Common Issues

### Issue 1: "Query pattern not recognized"
**Check**: Console should show which model/queryType failed
**Fix**: The AI might not be generating the correct JSON structure

### Issue 2: "Unsupported model"
**Check**: Console will show the model name
**Fix**: The AI might be using wrong model name (should be "employee")

### Issue 3: No results found
**Check**: Verify Alex Ward exists in the database
**Fix**: Try with a different employee name that definitely exists

## Next Steps if Still Failing

1. Check server console logs for the three log statements above
2. Verify the AI is generating correct JSON with model="employee" and queryType="findMany"
3. Check if the operation string contains the name properly
4. Verify the name matching regex is working (should match capitalized names)

## Server Restart Required

**IMPORTANT**: After these changes, you MUST restart the Next.js development server for the changes to take effect:

```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
```

The AI training data is loaded at server startup, so changes won't be picked up until restart.
