# Collaborative Editing & Versioning System

**Status:** ✅ Implemented  
**Date:** November 18, 2024  
**Addresses:** SCREEN_DESIGNER_PRODUCTION_AUDIT.md Sections 1, 3, 5, and 10

---

## Executive Summary

This document describes the collaborative editing safeguards implemented for the onboarding template system, addressing critical production audit findings around concurrent editing, version conflicts, and data loss prevention.

### Key Features

- **Optimistic Locking:** Row-version checks prevent stale writes
- **Autosave Drafts:** Incremental saves every 3 seconds without affecting published state
- **Version History:** Full audit trail with rollback capability
- **Undo/Redo:** Client-side and server-backed version navigation
- **Conflict Detection:** Clear error messages with latest template data
- **Publish Tracking:** Separate draft and published states with metadata

---

## Architecture

### Database Schema

#### OnboardingTemplate Extensions

```prisma
model OnboardingTemplate {
  // ... existing fields ...
  version              Int                          @default(1)
  publishedAt          DateTime?
  publishedBy          String?
  PublishedByUser      User?                        @relation("OnboardingTemplatePublishedBy", fields: [publishedBy], references: [id])
  VersionHistory       TemplateVersion[]
  
  @@index([companyId, version])
  @@index([companyId, isActive])
}
```

#### OnboardingStep Extensions

```prisma
model OnboardingStep {
  // ... existing fields ...
  version                     Int                      @default(1)
  updatedAt                   DateTime                 @updatedAt
  updatedBy                   String?
  UpdatedByUser               User?                    @relation("OnboardingStepUpdatedBy", fields: [updatedBy], references: [id])
  VersionHistory              TemplateStepVersion[]
  
  @@index([templateId, version])
}
```

#### TemplateVersion (New)

Stores complete version snapshots for rollback and audit:

```prisma
model TemplateVersion {
  id                String             @id @default(cuid())
  templateId        String
  companyId         String
  version           Int
  status            TemplateVersionStatus @default(DRAFT)
  name              String
  description       String?
  isActive          Boolean
  departmentIds     String[]           @default([])
  jobRoleIds        String[]           @default([])
  stepsSnapshot     Json               // Full snapshot of steps
  createdAt         DateTime           @default(now())
  createdBy         String
  publishedAt       DateTime?
  publishedBy       String?
  changesSummary    String?
  
  @@unique([templateId, version])
  @@index([templateId, status])
  @@index([companyId, createdAt])
}
```

#### TemplateStepVersion (New)

Granular step-level version history:

```prisma
model TemplateStepVersion {
  id                String             @id @default(cuid())
  templateVersionId String
  stepId            String
  companyId         String
  version           Int
  // ... all step fields ...
  changeType        String?            // 'created' | 'updated' | 'deleted' | 'reordered'
  
  @@unique([templateVersionId, stepId, version])
  @@index([stepId, version])
}
```

---

## API Endpoints

### 1. Update Template (Enhanced)

**Endpoint:** `PUT /api/onboarding/templates`

**New Parameters:**
- `lastKnownVersion` (number, optional): Expected version for optimistic locking
- `lastKnownUpdatedAt` (string, optional): Expected timestamp for conflict detection
- `createSnapshot` (boolean, optional): Whether to create version snapshot

**Behavior:**
- Checks `lastKnownVersion` against current version
- Checks `lastKnownUpdatedAt` against current timestamp
- Returns `409 Conflict` with latest template data if mismatch
- Increments version number on successful update
- Creates version snapshot if `createSnapshot=true`
- Updates `publishedAt` and `publishedBy` when `isActive=true`

**Example Request:**
```typescript
const response = await fetch('/api/onboarding/templates', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'template_123',
    name: 'Updated Template',
    lastKnownVersion: 5,
    lastKnownUpdatedAt: '2024-11-18T10:30:00.000Z',
    createSnapshot: true,
    steps: [/* ... */],
  }),
});

if (response.status === 409) {
  const { error, latestTemplate } = await response.json();
  // Handle conflict: show merge UI or reload
}
```

### 2. Autosave Draft

**Endpoint:** `POST /api/onboarding/templates/autosave`

**Purpose:** Save incremental drafts without affecting published state

**Parameters:**
- `templateId` (string, required)
- `name` (string, required)
- `description` (string, optional)
- `departments` (array, optional)
- `jobRoles` (array, optional)
- `steps` (array, required)
- `changesSummary` (string, optional)

**Behavior:**
- Creates `TemplateVersion` with `status='DRAFT'`
- Does NOT modify `OnboardingTemplate.isActive`
- Does NOT increment template version
- Tenant-scoped validation

**Example:**
```typescript
await fetch('/api/onboarding/templates/autosave', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateId: 'template_123',
    name: 'My Template',
    steps: currentSteps,
    changesSummary: 'Updated step 3 metadata',
  }),
});
```

### 3. Get Version History

**Endpoint:** `GET /api/onboarding/templates/autosave?templateId={id}&limit={n}`

**Returns:**
```typescript
{
  versions: [
    {
      id: string;
      version: number;
      status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
      name: string;
      description: string | null;
      isActive: boolean;
      createdAt: string;
      publishedAt: string | null;
      changesSummary: string | null;
      CreatedByUser: { id: string; name: string; email: string };
      PublishedByUser: { id: string; name: string; email: string } | null;
    }
  ]
}
```

---

## Client-Side Hooks

### useTemplateVersioning

Enhanced versioning hook with undo/redo and autosave:

```typescript
import { useTemplateVersioning } from '@/app/components/onboarding/builder/useTemplateVersioning';

function TemplateEditor({ templateId }: { templateId: string }) {
  const {
    // State
    isDirty,
    canUndo,
    canRedo,
    historySize,
    currentIndex,
    
    // Actions
    pushVersion,
    undo,
    redo,
    scheduleAutosave,
    markAsSaved,
    loadVersionHistory,
    getCurrentSnapshot,
    cleanup,
  } = useTemplateVersioning(templateId);

  // Load history on mount
  useEffect(() => {
    loadVersionHistory();
    return cleanup;
  }, [loadVersionHistory, cleanup]);

  // Track changes and schedule autosave
  const handleChange = (newSnapshot: TemplateSnapshot) => {
    pushVersion(newSnapshot, 'User edit');
    scheduleAutosave(newSnapshot, 'Autosave');
  };

  // Undo/Redo handlers
  const handleUndo = () => {
    const previousSnapshot = undo();
    if (previousSnapshot) {
      applySnapshot(previousSnapshot);
    }
  };

  const handleRedo = () => {
    const nextSnapshot = redo();
    if (nextSnapshot) {
      applySnapshot(nextSnapshot);
    }
  };

  // Explicit save/publish
  const handleSave = async () => {
    const snapshot = getCurrentSnapshot();
    if (!snapshot) return;

    const response = await fetch('/api/onboarding/templates', {
      method: 'PUT',
      body: JSON.stringify({
        ...snapshot,
        lastKnownVersion: snapshot.version,
        createSnapshot: true,
      }),
    });

    if (response.ok) {
      markAsSaved(snapshot);
    }
  };

  return (
    <div>
      <button onClick={handleUndo} disabled={!canUndo}>Undo</button>
      <button onClick={handleRedo} disabled={!canRedo}>Redo</button>
      <button onClick={handleSave} disabled={!isDirty}>Save</button>
      {isDirty && <span>Unsaved changes</span>}
    </div>
  );
}
```

---

## Conflict Resolution Flow

### 1. Optimistic Update Attempt

```typescript
try {
  const response = await fetch('/api/onboarding/templates', {
    method: 'PUT',
    body: JSON.stringify({
      id: templateId,
      name: 'My Update',
      lastKnownVersion: currentVersion,
      lastKnownUpdatedAt: currentUpdatedAt,
      steps: mySteps,
    }),
  });

  if (response.status === 409) {
    const { error, latestTemplate } = await response.json();
    handleConflict(latestTemplate);
  }
} catch (error) {
  console.error('Update failed:', error);
}
```

### 2. Conflict Handling

```typescript
function handleConflict(latestTemplate: SerializedOnboardingTemplate) {
  toast.error('Template was updated by another user', {
    action: {
      label: 'View Changes',
      onClick: () => showConflictDialog(latestTemplate),
    },
  });
}

function showConflictDialog(latestTemplate: SerializedOnboardingTemplate) {
  // Show diff UI
  const myChanges = getCurrentSnapshot();
  const theirChanges = latestTemplate;
  
  // Options:
  // 1. Reload and discard my changes
  // 2. Merge changes (manual or automatic)
  // 3. Save as new template
}
```

---

## Migration Guide

### Running the Migration

```bash
# Generate Prisma client with new schema
npx prisma generate

# Run migration
npx prisma migrate deploy

# Or for development
npx prisma migrate dev --name add_collaborative_editing_versioning
```

### Backward Compatibility

✅ **No breaking changes** - Existing templates continue to work:
- `version` defaults to `1`
- `publishedAt` and `publishedBy` are nullable
- Existing queries unaffected

### Data Backfill (Optional)

If you want to set initial `publishedAt` for active templates:

```sql
UPDATE "OnboardingTemplate"
SET 
  "publishedAt" = "updatedAt",
  "publishedBy" = "updatedById"
WHERE "isActive" = true AND "publishedAt" IS NULL;
```

---

## Testing

### Unit Tests

```bash
npm test tests/api/template-versioning.test.ts
```

**Coverage:**
- Optimistic locking with version numbers
- Optimistic locking with timestamps
- Version snapshot creation
- Conflict error details
- Publish tracking
- Tenant isolation

### Integration Tests

```bash
npm test tests/e2e/template-collaboration.cy.ts
```

**Scenarios:**
- Concurrent editing by two users
- Autosave during editing
- Undo/redo with server persistence
- Conflict resolution UI
- Version history browsing

---

## Performance Considerations

### Autosave Debouncing

- **Debounce:** 3000ms (configurable via `AUTOSAVE_DEBOUNCE_MS`)
- **Prevents:** Excessive database writes during rapid editing
- **Trade-off:** Up to 3 seconds of unsaved changes in worst case

### Version History Limits

- **Client-side:** 50 versions (configurable via `MAX_HISTORY_SIZE`)
- **Server-side:** No hard limit, but queries limited to 20 by default
- **Cleanup:** Consider archiving old drafts after 30 days

### Index Strategy

```sql
-- Fast version lookups
CREATE INDEX ON "OnboardingTemplate"("companyId", "version");

-- Fast history queries
CREATE INDEX ON "TemplateVersion"("templateId", "status");
CREATE INDEX ON "TemplateVersion"("companyId", "createdAt");

-- Fast step version lookups
CREATE INDEX ON "TemplateStepVersion"("stepId", "version");
```

---

## Security Considerations

### Tenant Isolation

✅ All endpoints validate `session.user.companyId` matches template/version `companyId`

### Permission Checks

- **Read:** `hasPermission(user, 'onboarding', 'read')`
- **Edit:** `hasPermission(user, 'onboarding', 'edit')`
- **Publish:** `hasPermission(user, 'onboarding', 'edit')` + explicit `isActive=true`

### Audit Trail

- `TemplateVersion.createdBy` tracks who made changes
- `OnboardingTemplate.publishedBy` tracks who published
- `OnboardingStepAuditLog` continues to track field-level changes

---

## Monitoring & Observability

### Key Metrics

1. **Conflict Rate:** `409` responses / total updates
2. **Autosave Success Rate:** Successful autosaves / attempted
3. **Version History Size:** Average versions per template
4. **Undo/Redo Usage:** Frequency of undo/redo actions

### Telemetry Events

```typescript
// Log conflicts
recordOnboardingTelemetryEvent({
  companyId,
  templateId,
  eventType: 'version_conflict',
  severity: 'warning',
  message: `Version conflict detected for template ${templateName}`,
  metadata: {
    expectedVersion,
    actualVersion,
    userId,
  },
});

// Log autosave failures
recordOnboardingTelemetryEvent({
  companyId,
  templateId,
  eventType: 'autosave_failure',
  severity: 'error',
  message: 'Failed to autosave template draft',
  metadata: { error: error.message },
});
```

---

## Troubleshooting

### Issue: Frequent Conflicts

**Cause:** Multiple users editing same template simultaneously

**Solution:**
1. Enable real-time collaboration indicators (future enhancement)
2. Encourage users to work on separate templates
3. Implement template locking for critical edits

### Issue: Autosave Not Working

**Checks:**
1. Verify user has `onboarding.edit` permission
2. Check browser console for network errors
3. Verify debounce timer is not being cleared prematurely
4. Check server logs for autosave endpoint errors

### Issue: Version History Growing Too Large

**Solution:**
```sql
-- Archive old drafts (keep published versions)
UPDATE "TemplateVersion"
SET status = 'ARCHIVED'
WHERE 
  status = 'DRAFT' 
  AND "createdAt" < NOW() - INTERVAL '30 days';

-- Or delete old drafts
DELETE FROM "TemplateVersion"
WHERE 
  status = 'DRAFT' 
  AND "createdAt" < NOW() - INTERVAL '90 days';
```

---

## Future Enhancements

### Phase 2 (Post-Launch)

1. **Real-time Collaboration**
   - WebSocket-based presence indicators
   - Live cursor positions
   - Collaborative editing with OT/CRDT

2. **Advanced Merge**
   - Three-way merge UI
   - Automatic conflict resolution for non-overlapping changes
   - Visual diff viewer

3. **Version Comparison**
   - Side-by-side diff view
   - Highlight changed steps
   - Rollback to specific version

4. **Branch/Fork**
   - Create template variants
   - Merge branches back to main
   - Template inheritance

---

## References

- **Audit Document:** `SCREEN_DESIGNER_PRODUCTION_AUDIT.md`
- **Security Audit:** `SECURITY_AUDIT_SUMMARY.md`
- **Migration:** `prisma/migrations/20241118000000_add_collaborative_editing_versioning/migration.sql`
- **Tests:** `tests/api/template-versioning.test.ts`

---

**Status:** ✅ Production Ready  
**Next Review:** Q1 2025
