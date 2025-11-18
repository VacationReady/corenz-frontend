# Documents Filter Persistence Implementation

## Overview

The Documents page now supports persistent filters through URL query parameters and localStorage. This allows administrators to:

- **Bookmark filtered views** - Share or save specific filter configurations via URL
- **Resume previous session** - Return to the last used filter configuration after page refresh
- **No filter flash** - Filters are hydrated before data fetches, preventing unfiltered results from flashing on screen

## Features

### Persisted Filters

All document filters are now persisted:
- **Search** - Text search query
- **Document Types** - Selected document type filters
- **Categories** - Selected category filters  
- **Departments** - Selected department filters
- **Job Roles** - Selected job role filters
- **Sort By** - Sort field (name, date, size, type, category)
- **Sort Order** - Sort direction (asc/desc)

### Persistence Strategy

The implementation uses a two-tier persistence strategy:

1. **URL Query Parameters (Priority 1)** - Filters are encoded in the URL for bookmarkable, shareable views
2. **localStorage (Priority 2)** - Fallback storage for filter state between sessions

### How It Works

#### Hydration Flow

1. On page load, the `FilterProvider` checks for filters in this order:
   - URL query parameters (highest priority)
   - localStorage (fallback if no URL params)
   - Default state (if no persisted filters found)

2. Filters are restored **synchronously** before the first render to prevent flashing unfiltered content

3. The documents data fetch uses the hydrated filters immediately

#### Synchronization Flow

1. When a user changes filters, the update is debounced (150ms)
2. Filters are synced to:
   - URL query parameters (via Next.js router.replace with scroll: false)
   - localStorage (for session persistence)

3. The URL update uses `replace` instead of `push` to avoid polluting browser history

## Technical Details

### Component Changes

#### FilterProvider Enhancement

Location: `app/components/ui/FilterProvider.tsx`

New props:
```typescript
interface FilterProviderProps {
  persistenceKey?: string;        // Unique key for localStorage
  enableUrlSync?: boolean;        // Enable URL param sync (default: true if persistenceKey set)
  enableLocalStorage?: boolean;   // Enable localStorage (default: true if persistenceKey set)
}
```

Key functions:
- `serializeFiltersToUrl()` - Converts FilterState to URLSearchParams
- `deserializeFiltersFromUrl()` - Parses URLSearchParams back to FilterState
- `saveFiltersToLocalStorage()` - Persists filters to localStorage with date serialization
- `loadFiltersFromLocalStorage()` - Loads and deserializes filters from localStorage

#### DocumentsPageClient Integration

Location: `app/components/documents/DocumentsPageClient.tsx`

```typescript
export default function DocumentsPageClient() {
  return (
    <FilterProvider
      persistenceKey="documents-filters"
      enableUrlSync={true}
      enableLocalStorage={true}
    >
      <DocumentsContent />
    </FilterProvider>
  );
}
```

### URL Format

Example bookmarkable URL:
```
/documents?search=policy&categories=HR,Compliance&departments=dept-123&sortBy=date&sortOrder=desc
```

Query parameters:
- `search` - Search query string
- `documentTypes` - Comma-separated document types
- `categories` - Comma-separated category names
- `departments` - Comma-separated department IDs
- `jobRoles` - Comma-separated job role IDs
- `status` - Comma-separated status values
- `locations` - Comma-separated location values
- `authors` - Comma-separated author IDs
- `sortBy` - Sort field name
- `sortOrder` - "asc" or "desc"
- `dateFrom` - ISO date string
- `dateTo` - ISO date string

### localStorage Format

Key: `documents-filters`

Value: JSON serialized FilterState with ISO date strings:
```json
{
  "search": "policy",
  "documentTypes": ["PDF"],
  "categories": ["HR"],
  "departments": ["dept-123"],
  "jobRoles": [],
  "status": [],
  "locations": [],
  "authors": [],
  "sortBy": "date",
  "sortOrder": "desc",
  "dateRange": {
    "from": "2024-01-01T00:00:00.000Z",
    "to": null
  }
}
```

## Usage Examples

### For Administrators

#### Bookmark a Filtered View
1. Navigate to Documents page
2. Apply desired filters (e.g., Category: "HR Policies", Department: "Engineering")
3. Copy the URL from the browser address bar
4. Share or save the URL - anyone opening it will see the same filtered view

#### Quick Access to Recent Filters
1. Close the Documents page
2. Navigate away or close the browser
3. Return to Documents page later
4. Your previous filters are automatically restored

### For Developers

#### Enabling Persistence for Other Pages

```typescript
import { FilterProvider } from "@/components/ui/FilterProvider";

export default function MyPageClient() {
  return (
    <FilterProvider
      persistenceKey="my-page-filters"  // Unique key required
      enableUrlSync={true}               // Optional, default true
      enableLocalStorage={true}          // Optional, default true
    >
      <MyPageContent />
    </FilterProvider>
  );
}
```

#### Customizing Persistence

```typescript
// Only use localStorage (no URL sync)
<FilterProvider
  persistenceKey="internal-filters"
  enableUrlSync={false}
  enableLocalStorage={true}
>

// Only use URL (no localStorage)
<FilterProvider
  persistenceKey="shared-filters"
  enableUrlSync={true}
  enableLocalStorage={false}
>

// No persistence (backward compatible)
<FilterProvider>
```

## Benefits

1. **Improved User Experience**
   - No need to reapply filters after page refresh
   - Seamless continuation of work sessions
   - Ability to share specific filtered views with team members

2. **Performance**
   - Filters hydrate synchronously before data fetch
   - No flash of unfiltered content
   - Debounced sync prevents excessive updates

3. **Bookmarkable Views**
   - Admins can create "saved searches" via bookmarks
   - Support teams can share filtered views in documentation
   - Deep-linkable for external integrations

4. **Backward Compatible**
   - Existing FilterProvider usage works unchanged
   - Opt-in via `persistenceKey` prop
   - Graceful fallback if localStorage is unavailable

## Migration Notes

### Existing Pages Using FilterProvider

No changes required! The enhanced FilterProvider is fully backward compatible:

```typescript
// This continues to work exactly as before (no persistence)
<FilterProvider>
  <MyContent />
</FilterProvider>
```

To add persistence, simply add the `persistenceKey`:

```typescript
// This enables persistence
<FilterProvider persistenceKey="my-filters">
  <MyContent />
</FilterProvider>
```

### Testing

The implementation handles edge cases:
- Missing localStorage (private browsing, etc.)
- Invalid JSON in localStorage
- Malformed URL parameters
- Date parsing failures
- SSR/hydration mismatches

All errors are caught and logged with graceful fallback to default state.

## Future Enhancements

Potential improvements:
- Server-side filter presets (saved by user or admin)
- Filter history (undo/redo)
- Named filter configurations
- Export/import filter configurations
- Analytics on popular filter combinations

## Related Files

- `app/components/ui/FilterProvider.tsx` - Filter context with persistence
- `app/components/documents/DocumentsPageClient.tsx` - Documents page implementation
- `app/types/filter.ts` - Filter type definitions
- `app/components/ui/FilterBar.tsx` - Filter UI components
