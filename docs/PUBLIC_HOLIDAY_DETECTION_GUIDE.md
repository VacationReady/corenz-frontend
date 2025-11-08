# Public Holiday Detection - Developer Guide

Quick reference for using the NZ public holiday detection system.

## Quick Start

```typescript
import { isNZPublicHoliday } from '@/lib/public-holiday-checker';

// Check if a date is a public holiday
const isHoliday = await isNZPublicHoliday(
  new Date('2024-12-25'),
  companyId
);

if (isHoliday) {
  // Apply special handling (e.g., overtime multiplier)
}
```

## Common Use Cases

### 1. Overtime Calculation
```typescript
// Automatically integrated in overtime-calculator.ts
const isPublicHoliday = await isNZPublicHoliday(entry.date, companyId);

if (isPublicHoliday) {
  multiplier = settings.publicHolidayMultiplier; // e.g., 2.0x
  specialDayReason = ' (Public Holiday)';
}
```

### 2. Check Regional Holiday
```typescript
// Override company's region setting
const isHoliday = await isNZPublicHoliday(
  date,
  companyId,
  'NZ-AUK' // Auckland region
);
```

### 3. Batch Check Multiple Dates
```typescript
const dates = [
  new Date('2024-12-25'),
  new Date('2024-12-26'),
  new Date('2024-12-27'),
];

// Efficiently check multiple dates (uses cache)
const results = await Promise.all(
  dates.map(date => isNZPublicHoliday(date, companyId))
);
```

## Regional Codes

| Region | Code | Anniversary Day |
|--------|------|-----------------|
| National | `null` or `'NZ'` | None |
| Auckland | `'NZ-AUK'` | ~Jan 29 |
| Wellington | `'NZ-WGN'` | ~Jan 22 |
| Canterbury | `'NZ-CAN'` | ~Nov 16 |
| Otago | `'NZ-OTA'` | ~Mar 23 |

## NZ National Holidays (2024)

| Holiday | Date | Notes |
|---------|------|-------|
| New Year's Day | Jan 1 | Fixed |
| Day after New Year's | Jan 2 | Fixed |
| Waitangi Day | Feb 6 | Fixed |
| Good Friday | Mar 29 | Varies |
| Easter Monday | Apr 1 | Varies |
| ANZAC Day | Apr 25 | Fixed |
| King's Birthday | Jun 3 | First Mon in June |
| Matariki | Jun 28 | Varies |
| Labour Day | Oct 28 | 4th Mon in Oct |
| Christmas Day | Dec 25 | Fixed |
| Boxing Day | Dec 26 | Fixed |

## Configuration

### Company Settings
Set in database:
```sql
UPDATE Company 
SET publicHolidayTemplate = 'NZ',
    publicHolidayRegion = 'NZ-AUK'
WHERE id = 'company-id';
```

### Supported Templates
- `'NZ'` - New Zealand
- `'AU'` - Australia
- `'UK'` - United Kingdom

## Performance

- **First call**: ~50-100ms (database + library)
- **Cached calls**: <1ms
- **Cache TTL**: 24 hours for holidays, 1 hour for company settings
- **Memory**: ~50 bytes per cached date

## Error Handling

Function never throws - always returns boolean:
```typescript
try {
  const isHoliday = await isNZPublicHoliday(date, companyId);
} catch (error) {
  // This will never happen - function handles all errors internally
}
```

## Debugging

### Check Cache Stats
```typescript
import { getHolidayCacheStats } from '@/lib/public-holiday-checker';

console.log(getHolidayCacheStats());
// { companySettingsCacheSize: 5, holidayCacheSize: 150 }
```

### Clear Cache (Testing Only)
```typescript
import { clearHolidayCache } from '@/lib/public-holiday-checker';

clearHolidayCache(); // Clears all caches
```

### Enable Debug Logs
Set `DEBUG=public-holiday-checker` in environment to see detailed logs.

## Testing

### Unit Tests
```bash
npm test tests/lib/public-holiday-checker.test.ts
```

### Integration Tests
```bash
npm test tests/lib/public-holiday-checker.integration.test.ts
```

### Mock in Tests
```typescript
// Mock for unit tests
jest.mock('@/lib/public-holiday-checker', () => ({
  isNZPublicHoliday: jest.fn().mockResolvedValue(true)
}));
```

## Common Issues

### Issue: Holidays Not Detected
**Solution**: Check company has `publicHolidayTemplate` set:
```sql
SELECT id, publicHolidayTemplate, publicHolidayRegion 
FROM Company 
WHERE id = 'company-id';
```

### Issue: Wrong Regional Holiday
**Solution**: Verify `publicHolidayRegion` is correct:
- Auckland: `'NZ-AUK'`
- Wellington: `'NZ-WGN'`
- Canterbury: `'NZ-CAN'`

### Issue: Slow Performance
**Solution**: Check cache is working:
```typescript
clearHolidayCache(); // Reset
await isNZPublicHoliday(date, companyId); // Warm cache
const stats = getHolidayCacheStats(); // Should show entries
```

## Best Practices

### ✅ Do
- Use for overtime calculations
- Cache results automatically (built-in)
- Check at start of day for date
- Use region overrides sparingly

### ❌ Don't
- Don't call in tight loops without batching
- Don't clear cache in production
- Don't rely on specific holiday names
- Don't bypass company settings

## API Reference

### `isNZPublicHoliday(date, companyId, regionOverride?)`

**Parameters:**
- `date: Date` - Date to check (time normalized to start of day)
- `companyId: string` - Company identifier for settings lookup
- `regionOverride?: string` - Optional region code override

**Returns:**
- `Promise<boolean>` - `true` if public holiday, `false` otherwise

**Throws:**
- Never throws - all errors handled internally

### `clearHolidayCache()`

Clears all cached holiday data and company settings.

**Use Case**: Testing, debugging, forced refresh

**Warning**: Don't use in production - cache warms automatically

### `getHolidayCacheStats()`

Returns cache statistics for monitoring.

**Returns:**
```typescript
{
  companySettingsCacheSize: number;
  holidayCacheSize: number;
}
```

## Support

For issues or questions:
1. Check logs for `[public-holiday-checker]` entries
2. Review company holiday settings in database
3. Verify `date-holidays` library is up to date
4. Run integration tests to validate library data

## Version History

- **v1.0.0** (Nov 8, 2024) - Initial implementation
  - National NZ holidays
  - Regional support
  - Caching system
  - Comprehensive tests
