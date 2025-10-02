# Workflow Realtime Test Mode - Implementation Guide

## Overview

This document describes the end-to-end "Realtime Test" mode for automation workflows, allowing users to execute dry-run simulations of workflows without affecting production data.

## Architecture

### Backend Components

#### 1. Test Simulator (`app/lib/automation/test-simulator.ts`)

The core test execution engine that:
- Manages test sessions with unique session IDs
- Executes workflow nodes sequentially (trigger → conditions → actions)
- Supports both visual canvas workflows and legacy form-based workflows
- Provides real-time updates via EventEmitter
- Captures all outputs without side effects

**Key Features:**
- Mock execution context for all actions
- Delay skipping for fast testing
- Support for branches, loops, and conditional logic
- In-memory session storage with automatic cleanup

**Types:**
```typescript
interface TestRunConfig {
  workflowId?: string;
  workflowDefinition?: { nodes: any[]; edges: any[] };
  triggerType: string;
  triggerConfig: any;
  conditions?: any[];
  actions?: any[];
  skipDelays?: boolean;  // Default: true
  inputOverrides?: any;
}

interface TestRunResult {
  sessionId: string;
  status: "pending" | "running" | "completed" | "failed";
  steps: TestStepLog[];
  outputs: {
    notifications: MockNotification[];
    tasks: MockTask[];
    webhooks: MockWebhook[];
    fieldUpdates: MockFieldUpdate[];
  };
  summary?: {
    totalSteps: number;
    successSteps: number;
    failedSteps: number;
    duration: number;
    triggeredAt: Date;
    completedAt?: Date;
  };
  error?: string;
}
```

#### 2. API Endpoints

**POST `/api/automation-rules/[id]/test`**
- Starts a new test run
- Accepts both saved rules (by ID) and unsaved drafts
- Returns `sessionId` and stream URLs
- Request body:
  ```json
  {
    "skipDelays": true,
    "inputOverrides": {
      "employeeId": "employee-123",
      "formId": "form-456"
    },
    "workflowDefinition": { ... }  // For unsaved drafts
  }
  ```

**GET `/api/automation-rules/[id]/test/stream?session=<sessionId>`**
- Server-Sent Events (SSE) stream for real-time updates
- Automatically closes when test completes or fails
- Auto-timeout after 5 minutes
- Format: `data: {JSON}\n\n`

**GET `/api/automation-rules/[id]/test/status?session=<sessionId>`**
- Polling fallback for clients that don't support SSE
- Returns current test run status
- Use for manual status checks

#### 3. Mock Execution

All actions are executed through mock clients that capture outputs without side effects:

**Mock Notifications:**
- Captures channel, recipients, subject, and message
- Marked with `simulated: true` flag
- No actual emails/Slack/Teams messages sent

**Mock Tasks:**
- Captures task title, description, assignee, and due date
- No database records created
- No action items generated

**Mock Webhooks:**
- Captures URL, method, and payload
- No actual HTTP requests made

**Mock Field Updates:**
- Captures field, old value, and new value
- No database modifications

### Frontend Components

#### 1. TestRunLauncher (`TestRunLauncher.tsx`)

Configuration dialog for test runs:
- Displays rule summary with trigger description
- Warning banner if rule is active
- Skip delays toggle (default: ON)
- Optional employee/form selection for context
- Advanced JSON payload editor
- Clear explanation of test behavior

**Props:**
```typescript
interface TestRunLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rule?: AutomationRule;
  onStartTest: (config: { skipDelays: boolean; inputOverrides?: any }) => void;
  employeesOptions?: { value: string; label: string }[];
  formsOptions?: { value: string; label: string }[];
}
```

#### 2. TestExecutionViewer (`TestExecutionViewer.tsx`)

Real-time execution visualization:
- Live SSE stream with automatic fallback to polling
- Progress bar showing completion percentage
- Summary cards: Total Steps, Successful, Failed, Duration
- Execution timeline with step-by-step status
- Collapsible detailed logs
- Output panels for notifications, tasks, webhooks, and field updates
- Export to JSON functionality
- Re-run button

**Props:**
```typescript
interface TestExecutionViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  ruleId?: string;
  ruleName?: string;
  onReRun?: () => void;
  onHighlightNode?: (nodeId: string) => void;  // For canvas integration
}
```

**Status Visualization:**
- ✅ Success: Green border, check icon
- ❌ Failed: Red border, X icon
- 🔄 Running: Blue border, spinning loader, ring highlight
- ⏸️ Skipped: Gray border, alert icon
- ⏳ Pending: Gray border, clock icon

#### 3. Integration Points

**AutomationFlowBuilder:**
- Test button in header toolbar
- Disabled when validation fails (with tooltip)
- Opens test launcher for both saved and unsaved rules

**AutomationRuleList:**
- "Test" option in rule dropdown menu
- Triggers test launcher with selected rule

**Enhanced Workflow Canvas:**
- Node highlighting during execution (via `onHighlightNode` callback)
- Visual indication of currently executing node

## Usage Flow

### 1. Starting a Test

```
User clicks "Test" → 
  TestRunLauncher opens →
    Configure options (skip delays, overrides) →
      Click "Run Test" →
        API call to start test →
          TestExecutionViewer opens with SSE stream
```

### 2. Execution Flow

```
Backend:
  Create session →
    Parse workflow definition →
      Execute trigger node →
        Execute condition nodes (short-circuit on failure) →
          Execute action nodes →
            Handle branches/loops →
              Generate summary →
                Mark complete

Frontend:
  Receive SSE updates →
    Update progress bar →
      Highlight current node →
        Display outputs as they're generated →
          Show summary when complete
```

### 3. Re-running Tests

```
Click "Re-run" →
  Close execution viewer →
    Open test launcher with previous configuration →
      Modify settings if desired →
        Run new test
```

## Configuration Options

### Skip Delays

When enabled (default):
- All delay nodes execute instantly
- Original delay values are logged for reference
- Badge shows "0s (test mode)"

When disabled:
- Delays are capped at 5 seconds for safety
- Provides more realistic timing
- Useful for testing timing-sensitive workflows

### Input Overrides

Allows manual specification of trigger context:
- **Employee ID**: Test with specific employee data
- **Form ID**: Simulate specific form submission
- **Custom JSON**: Override any trigger data field

Example:
```json
{
  "employeeId": "emp-123",
  "formId": "form-456",
  "customField": "customValue"
}
```

## Error Handling

### Validation

- Rules must pass validation before testing
- Test button is disabled with tooltip when invalid
- Common validation errors:
  - Missing trigger type
  - Missing action configuration
  - Invalid condition operators
  - Empty action arrays

### Runtime Errors

- Captured per-step with error messages
- Test continues through non-critical errors
- Test fails on critical errors (e.g., missing node connections)
- Full error details in execution logs

### Network Issues

- SSE stream auto-reconnects on disconnect
- Automatic fallback to polling if SSE fails
- Clear error messages for API failures
- Retry capabilities built-in

## Performance Considerations

### Session Management

- Sessions stored in-memory (Map structure)
- Automatic cleanup after 1 hour
- Cleanup runs every 10 minutes
- EventEmitters cleaned up on session close

### Scalability

- No database writes during tests
- Minimal memory footprint per session
- Sessions isolated per company
- No impact on production workflows

### SSE Optimization

- Streams automatically close when complete
- 5-minute timeout for abandoned connections
- Respects client abort signals
- No-cache headers prevent buffering

## Security

### Authorization

- All endpoints require valid session
- Company ID verification on every request
- User must have permission to view rules
- Draft tests only accessible to creator

### Data Isolation

- Tests never access production data
- Mock clients prevent side effects
- Input overrides sanitized
- Session IDs are UUIDs (not sequential)

### Rate Limiting

Recommended limits:
- 10 concurrent tests per company
- 100 tests per hour per user
- Max test duration: 5 minutes

## Testing the Test System

### Unit Tests

Add to `app/lib/automation/tests/`:

```typescript
describe("AutomationTestSimulator", () => {
  it("should execute trigger node", async () => { ... });
  it("should skip delays when configured", async () => { ... });
  it("should capture mock notifications", async () => { ... });
  it("should handle branches correctly", async () => { ... });
  it("should handle loops correctly", async () => { ... });
});
```

### Integration Tests

Add to `tests/automation/`:

```typescript
describe("Test Mode API", () => {
  it("should start test for saved rule", async () => { ... });
  it("should start test for draft", async () => { ... });
  it("should stream updates via SSE", async () => { ... });
  it("should handle concurrent tests", async () => { ... });
});
```

### Manual Test Cases

1. **Basic Flow**
   - Create simple rule (1 trigger + 1 action)
   - Click Test button
   - Verify launcher opens
   - Run test with skip delays ON
   - Verify execution completes in <1s
   - Verify outputs are captured

2. **Complex Workflow**
   - Create rule with branches and loops
   - Add multiple conditions
   - Run test
   - Verify all branches execute
   - Verify loop iterations are correct

3. **Error Handling**
   - Create rule with invalid condition
   - Run test
   - Verify error is caught and displayed
   - Verify execution stops gracefully

4. **Unsaved Draft**
   - Create rule but don't save
   - Click Test button
   - Verify test runs with inline definition
   - Verify no database writes occur

5. **Re-run Capability**
   - Run test
   - Wait for completion
   - Click Re-run
   - Modify configuration
   - Run again
   - Verify new session is created

## Troubleshooting

### SSE Stream Not Working

**Symptoms:** No real-time updates, execution appears frozen

**Solutions:**
1. Check browser console for connection errors
2. Verify SSE endpoint is accessible
3. Check for proxy/load balancer buffering
4. System automatically falls back to polling

### Test Hangs or Times Out

**Symptoms:** Progress bar stops, no updates

**Solutions:**
1. Check for infinite loops in workflow
2. Verify delay nodes aren't too long (capped at 5s)
3. Check session still exists in memory
4. Force-close and restart test

### Outputs Not Displayed

**Symptoms:** Test completes but no outputs shown

**Solutions:**
1. Check action configurations are valid
2. Verify action types are recognized
3. Check browser console for rendering errors
4. Export JSON to inspect raw data

### Node Highlighting Not Working

**Symptoms:** Canvas doesn't highlight executing nodes

**Solutions:**
1. Verify `onHighlightNode` callback is wired
2. Check node IDs match between definition and canvas
3. Ensure canvas is in view mode (not editing)
4. Check for React rendering issues

## Future Enhancements

### Potential Improvements

1. **Breakpoints**: Pause execution at specific nodes
2. **Step-through**: Execute one node at a time
3. **Variable inspection**: View context variables at each step
4. **Historical runs**: Save test results for comparison
5. **Performance profiling**: Detailed timing per node
6. **Coverage metrics**: Track which paths have been tested
7. **Collaborative testing**: Share test results with team
8. **Test scenarios**: Save and replay test configurations
9. **Automated testing**: Run tests on rule save
10. **Diff visualization**: Compare test results

### API Extensions

1. **Batch testing**: Test multiple rules at once
2. **Scheduled tests**: Run tests on a schedule
3. **Webhook notifications**: Alert on test failures
4. **Export formats**: PDF, CSV, HTML reports
5. **Test templates**: Predefined test scenarios

## Migration Notes

### Upgrading from Legacy Dry-Run

The old `DryRunResultsDialog` is kept for backward compatibility but can be removed once all clients migrate:

1. Both systems co-exist temporarily
2. New test mode is preferred UI
3. Old dry-run still accessible via API
4. Gradual migration recommended

### Database Schema

No schema changes required! All test data is in-memory.

### Breaking Changes

None. This is a pure addition with no breaking changes to existing functionality.

## Summary

The Realtime Test Mode provides:
- ✅ **Safe testing**: No side effects or production data modification
- ✅ **Rich feedback**: Real-time progress with detailed logs
- ✅ **Fast execution**: Skip delays for instant results
- ✅ **Flexible configuration**: Override triggers and context
- ✅ **Professional UX**: Clear visualization and status indicators
- ✅ **Complete coverage**: Tests all node types and workflows
- ✅ **Robust architecture**: SSE with polling fallback, automatic cleanup
- ✅ **Developer-friendly**: Comprehensive logging and error handling

Users can now confidently test automation rules before activation, ensuring workflows behave as expected without risk to production systems.
