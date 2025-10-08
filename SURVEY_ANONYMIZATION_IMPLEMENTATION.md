# Survey Anonymization Implementation

## Overview
Implemented fully functional survey anonymization to protect employee privacy based on configurable privacy settings.

## Problem Identified
The UI allowed users to select anonymization levels (Public, Department, Location, Fully Anonymous), but this was **non-functional** - the setting was stored in the database but never enforced. All API endpoints returned full employee details regardless of the anonymization setting.

## Solution Implemented

### 1. **Anonymization Utility** (`/app/lib/survey-anonymization.ts`)
Created a comprehensive utility module with:

- **`anonymizeEmployeeData()`**: Applies anonymization rules based on level
- **`getAnonymizationLevel()`**: Extracts anonymization setting from survey metadata
- **`isFieldVisible()`**: Helper to check field visibility by level

**Anonymization Levels:**
- `public` - Full details (name, email, department, position, location)
- `department` - Department and position only (no individual identification)
- `location` - Location and position only (no individual identification)  
- `full` - Position only (completely anonymous)

### 2. **Updated API Endpoints**

#### `/api/surveys/[id]/responses` (GET)
- Now reads `anonymizationLevel` from survey metadata
- Applies anonymization to all employee data in responses
- Returns `anonymizationLevel` in response for frontend awareness

#### `/api/surveys/[id]/analytics` (GET)
- Anonymizes employee data in both responses and recipients
- Preserves aggregate analytics (department analytics, averages, etc.)
- Individual response data is anonymized based on survey settings

#### `/api/surveys/[id]` (GET)
- Anonymizes `SurveyResponses` and `SurveyRecipients` employee data
- Maintains compatibility with existing survey details view

### 3. **Digest Endpoint** (`/api/surveys/[id]/digest`)
✅ **No changes needed** - This endpoint only sends aggregated analytics without individual employee data, which is correct behavior for privacy.

## Privacy Enforcement Examples

### Public Survey (Default)
```json
{
  "employee": {
    "id": "emp-123",
    "name": "John Smith",
    "email": "john.smith@company.com",
    "department": "Engineering",
    "position": "Senior Developer"
  }
}
```

### Department-Level Anonymization
```json
{
  "employee": {
    "department": "Engineering",
    "position": "Senior Developer"
  }
}
```

### Location-Level Anonymization
```json
{
  "employee": {
    "location": "New York Office",
    "position": "Senior Developer"
  }
}
```

### Fully Anonymous
```json
{
  "employee": {
    "position": "Senior Developer"
  }
}
```

## Technical Details

### Data Flow
1. User selects anonymization level in UI (`send/page.tsx`)
2. Level stored in `Survey.metadata.anonymizationLevel` field (JSON)
3. API endpoints read metadata and apply anonymization before returning data
4. Frontend receives appropriately filtered employee information

### Database Changes
**None required** - Uses existing `Survey.metadata` JSON field, making this a purely backend implementation without migration needs.

### Backward Compatibility
✅ **Fully backward compatible**
- Surveys without anonymization setting default to `"public"` (existing behavior)
- No breaking changes to API response structure
- Frontend receives same data structure, just with filtered fields

## Security Considerations

1. **Server-Side Enforcement**: Anonymization happens in the API layer, not client-side
2. **Metadata Immutability**: Anonymization level set at survey creation (stored in metadata)
3. **Consistent Application**: All response endpoints enforce the same rules
4. **No Data Loss**: Original data remains in database; only response filtering changes

## Testing Recommendations

1. **Create surveys with different anonymization levels**
2. **Verify response data matches expected anonymization**
3. **Check analytics views respect privacy settings**
4. **Confirm recipient lists follow anonymization rules**
5. **Test AI assistant mentions anonymization settings** (already in training data)

## Benefits

✅ **Employee Privacy**: Genuine protection for sensitive feedback  
✅ **Compliance**: Meets privacy requirements for anonymous surveys  
✅ **Flexibility**: Four levels to balance transparency vs. anonymity  
✅ **Trust**: Employees can provide honest feedback without fear  
✅ **Enterprise-Ready**: Supports complex organizational privacy needs

## Files Modified

1. **Created**: `/app/lib/survey-anonymization.ts` (utility module)
2. **Updated**: `/app/api/surveys/[id]/responses/route.ts`
3. **Updated**: `/app/api/surveys/[id]/analytics/route.ts`
4. **Updated**: `/app/api/surveys/[id]/route.ts`

## Next Steps (Optional Enhancements)

- [ ] Add anonymization indicator in survey cards/lists
- [ ] Add warning message when viewing anonymized responses
- [ ] Create admin audit log for anonymization level changes
- [ ] Add role-based overrides (e.g., HR can see full data)
- [ ] Export anonymization level in CSV exports
