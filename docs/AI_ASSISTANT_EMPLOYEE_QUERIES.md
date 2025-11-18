# AI Assistant - Employee Information Queries

## Overview
The AI Assistant is now fully trained to answer questions about individual employees across all employee screens and data fields.

## What Changed (Nov 18, 2025)

### 1. Enhanced Training Data
Updated `app/lib/ai/query-generator.ts` with comprehensive examples for individual employee queries:

- **Contact Details**: Phone numbers, email addresses, physical addresses
- **Personal Information**: Start dates, departments, job titles, full employee details
- **Employment Data**: Salary, contract type, location, tenure, and more

### 2. Improved Pattern Matching
Enhanced the query executor to better recognize:
- Full names (e.g., "Alex Ward", "Sarah Johnson")
- Various query formats (e.g., "What's...", "Show me...", "Get...", "Find...")
- Both first name and last name matching
- Case-insensitive searches

### 3. Better Response Formatting
The orchestrator now provides clean, formatted responses for individual employee lookups:
```
Alex Ward

📧 Email: alex.ward@company.com
📱 Phone: +64 21 123 4567
🏢 Department: Sales
💼 Role: Sales Manager
💰 Salary: $85,000/year
```

## Supported Query Types

### Contact Information
- "What's [name]'s phone number?"
- "What is [name]'s email?"
- "Show me [name]'s contact details"
- "Get [name]'s email and phone"

### Personal Details
- "When did [name] start?"
- "What department is [name] in?"
- "What's [name]'s job title?"
- "Show me [name]'s details"

### General Lookups
- "Find [name]"
- "Look up [name]"
- "Get [name]'s info"
- "Tell me about [name]"

### Employment Information
All employee fields are accessible:
- Salary and compensation
- Contract type and dates
- Employment type (full-time, part-time, contractor)
- Site location
- Start date and tenure
- Department and job role
- IRD number and tax code
- KiwiSaver details
- Emergency contacts
- And more...

## How It Works

### 1. Query Classification
When you ask about a specific employee, the AI:
1. Detects the person's name in your query
2. Classifies it as a `query_data` action type
3. Routes it to the query generator

### 2. Query Generation
The query generator:
1. Extracts the first and last name
2. Creates a Prisma query filtering by name
3. Includes all relevant employee fields (User, Department, JobRole, etc.)

### 3. Result Formatting
The orchestrator:
1. Detects single-person results
2. Formats the response with relevant information
3. Shows only the fields that have values

## Examples

### Example 1: Phone Number Lookup
**Query**: "What's Alex Ward's phone number?"

**AI Response**:
```
Alex Ward

📱 Phone: +64 21 123 4567
📧 Email: alex.ward@company.com
🏢 Department: Sales
💼 Role: Sales Manager
```

### Example 2: Full Employee Details
**Query**: "Show me Sarah Johnson's details"

**AI Response**:
```
Sarah Johnson

📧 Email: sarah.johnson@company.com
📱 Phone: +64 27 987 6543
🏢 Department: Engineering
💼 Role: Senior Developer
💰 Salary: $95,000/year
```

### Example 3: Start Date
**Query**: "When did John Smith start?"

**AI Response**:
```
John Smith

📅 Start Date: January 15, 2023
🏢 Department: Marketing
💼 Role: Marketing Coordinator
```

## Coverage Across Employee Screens

The AI can now answer questions about data from all employee screens:

### ✅ Personal Information
- Name, email, phone
- Date of birth, age
- Gender, pronouns
- Address details

### ✅ Employment Details
- Department, job role
- Start date, contract end date
- Employment type, contract type
- Site location

### ✅ Compensation
- Salary amount
- Hourly rate
- Pay frequency

### ✅ Tax & Payroll
- IRD number
- Tax code
- KiwiSaver enrollment and contribution
- Bank account details

### ✅ Leave & Time Off
- Leave balances
- Leave requests
- Timesheet data

### ✅ Documents & Compliance
- Driver license details
- Employment checks
- Document uploads
- Training records

### ✅ Emergency Contacts
- Contact names
- Relationships
- Phone numbers

## Technical Implementation

### Files Modified
1. **`app/lib/ai/query-generator.ts`**
   - Added individual employee query examples to SCHEMA_CONTEXT
   - Enhanced name pattern matching in executeQueryByType
   - Improved AI prompt instructions for name-based queries

2. **`app/lib/ai/orchestrator.ts`**
   - Already had proper formatting for single employee results (lines 758-776)
   - No changes needed - existing logic handles the formatted output

### Key Code Changes

#### Enhanced Name Matching
```typescript
// Match capitalized names (e.g., "Alex Ward", "John Smith")
const nameMatch = operation.match(/(?:firstName|lastName|name).*?["']([^"']+)["']/i) ||
                 operation.match(/(?:contains|includes)\s+["']([^"']+)["']/i) ||
                 operation.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/);

if (nameParts.length >= 2) {
  // Full name provided (e.g., "Alex Ward")
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  
  where.User = {
    OR: [
      { 
        AND: [
          { firstName: { contains: firstName, mode: 'insensitive' } },
          { lastName: { contains: lastName, mode: 'insensitive' } },
        ],
      },
      { name: { contains: searchName, mode: 'insensitive' } },
    ],
  };
}
```

#### Training Examples Added
```typescript
INDIVIDUAL EMPLOYEE QUERIES - Contact Details & Personal Info:
- "What's [name]'s phone number?" → employee model, findMany, filter by firstName/lastName, return phone
- "What is [name]'s email?" → employee model, findMany, filter by firstName/lastName, return email
- "Show me [name]'s contact details" → employee model, findMany, filter by firstName/lastName, return phone + email
...

CRITICAL EXAMPLES:
User: "What's Alex Ward's phone number?" → {queryType: "findMany", model: "employee", operation: "firstName contains 'Alex' AND lastName contains 'Ward'"}
```

## Testing

To test the implementation:

1. **Basic Phone Lookup**
   ```
   What's Alex Ward's phone number?
   ```

2. **Email Lookup**
   ```
   Get Sarah Johnson's email
   ```

3. **Full Details**
   ```
   Show me John Smith's details
   ```

4. **Department Info**
   ```
   What department is Michael Brown in?
   ```

5. **Start Date**
   ```
   When did Emily Davis start?
   ```

## Error Handling

If the AI can't find an employee:
- It will return a friendly message asking for clarification
- Suggests providing the full name
- May ask for additional context like department

If multiple employees match:
- The AI will show all matches
- User can then be more specific

## Future Enhancements

Potential improvements:
1. **Fuzzy Name Matching**: Handle typos and variations
2. **Nickname Support**: Map common nicknames to full names
3. **Disambiguation**: Smart handling of duplicate names
4. **Bulk Lookups**: "Show me contact details for all managers"
5. **Comparison Queries**: "Compare Alex Ward and Sarah Johnson's salaries"

## Troubleshooting

### Issue: "Query pattern not recognized"
**Solution**: Ensure the name is capitalized (e.g., "Alex Ward" not "alex ward")

### Issue: Too many results returned
**Solution**: Provide the full name (first and last) for better matching

### Issue: No results found
**Solution**: 
- Check spelling of the name
- Ensure the employee exists in the system
- Try using just the first or last name

## Related Documentation
- [AI_ASSISTANT_CAPABILITIES.md](./AI_ASSISTANT_CAPABILITIES.md)
- [AI_ASSISTANT_IMPLEMENTATION.md](./AI_ASSISTANT_IMPLEMENTATION.md)
- [AI_ASSISTANT_QUICK_REFERENCE.md](./AI_ASSISTANT_QUICK_REFERENCE.md)
