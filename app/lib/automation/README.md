# Automation Worker System

A comprehensive serverless-compatible automation system for the HR product management platform. This system enables no-code automation rules to streamline HR processes through trigger-based actions.

## 🏗️ Architecture Overview

The automation system consists of several key components:

- **Queue System** (`queue.ts`) - Database-based job queue for serverless environments
- **Rule Evaluator** (`evaluator.ts`) - Handles trigger evaluation and condition checking
- **Action Executor** (`executor.ts`) - Executes automation actions with error handling
- **Worker** (`worker.ts`) - Main worker process with circuit breaker and rate limiting
- **Scheduler** (`scheduler.ts`) - Manages trigger evaluation and job creation
- **API Endpoints** - RESTful APIs for triggering and monitoring

## 🚀 Features

### Trigger Types
- **Document Expiring** - Triggered when employment documents approach expiry
- **Form Submitted** - Triggered when specific forms are submitted
- **Onboarding Step Completed** - Triggered when onboarding milestones are reached
- **Employee Created** - Triggered when new employees are added

### Action Types
- **Create Task** - Assign tasks to employees, managers, or HR team
- **Send Notification** - Multi-channel notifications (email, Slack, Teams)
- **Start Onboarding** - Automatically assign onboarding templates
- **Update Field** - Modify employee record fields

### Condition System
- **Role-based** - Filter by employee roles (Admin, Manager, Employee)
- **Department-based** - Filter by organizational departments
- **Job Role-based** - Filter by specific job roles
- **Date Window** - Time-based conditional execution

## 📋 Usage

### Basic Setup

```typescript
import { 
  startAutomationSystem, 
  getAutomationWorker,
  getAutomationScheduler 
} from '@/lib/automation'

// Start the automation system
await startAutomationSystem()

// Get system status
const status = await getSystemStatus()
console.log('System healthy:', status.worker.isHealthy)
```

### Creating Automation Rules

Rules are created through the UI at `/settings/automation-rules` or via API:

```typescript
const rule = {
  name: 'Document Expiry Alert',
  description: 'Alert employees about expiring documents',
  triggerType: 'DOCUMENT_EXPIRING',
  triggerConfig: {
    daysBefore: 30,
    documentTypes: ['Passport', 'Visa']
  },
  conditions: [
    {
      type: 'role',
      config: { operator: 'in', value: ['EMPLOYEE', 'MANAGER'] }
    }
  ],
  actions: [
    {
      type: 'send_notification',
      config: {
        channels: ['email'],
        recipientType: 'employee',
        subject: 'Document Expiry Alert',
        message: 'Your document expires in 30 days'
      }
    },
    {
      type: 'create_task',
      config: {
        title: 'Renew Document',
        assigneeType: 'manager',
        dueDays: 7
      }
    }
  ]
}
```

### Manual Triggering

```typescript
// Trigger a specific rule
const response = await fetch('/api/automation/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ruleId: 'rule-123',
    triggerData: { employeeId: 'emp-456' }
  })
})

// Handle events
await fetch('/api/automation/trigger', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventType: 'form.submitted',
    eventData: {
      formId: 'form-123',
      employeeId: 'emp-456',
      submissionId: 'sub-789'
    }
  })
})
```

## 🔧 Configuration

### Worker Configuration

```typescript
const workerConfig = {
  maxConcurrentJobs: 5,        // Max parallel job processing
  pollIntervalMs: 5000,        // Queue polling interval
  jobTimeoutMs: 300000,        // 5 minute job timeout
  enableMetrics: true,         // Collect performance metrics
  enableCircuitBreaker: true,  // Enable circuit breaker pattern
  circuitBreakerThreshold: 5,  // Failures before opening circuit
}
```

### Rate Limiting

```typescript
const rateLimitConfig = {
  enabled: true,
  maxJobsPerMinute: 60,
  maxJobsPerHour: 1000,
  burstLimit: 10,
}
```

## 📊 Monitoring

### System Status

```typescript
// Get comprehensive system status
const status = await fetch('/api/automation/status?type=detailed')
const data = await status.json()

console.log('Worker Status:', data.worker)
console.log('Queue Stats:', data.queue)
console.log('Scheduler Status:', data.scheduler)
```

### Queue Statistics

```typescript
// Get queue statistics
const queueStats = await fetch('/api/automation/status?type=queue')
const stats = await queueStats.json()

console.log('Pending Jobs:', stats.queue.pending)
console.log('Running Jobs:', stats.queue.running)
console.log('Completed Jobs:', stats.queue.completed)
console.log('Failed Jobs:', stats.queue.failed)
```

### Health Checks

```typescript
// Health check for monitoring systems
const health = await fetch('/api/automation/status?type=health')
const healthData = await health.json()

if (healthData.status === 'healthy') {
  console.log('System is healthy')
} else {
  console.error('System issues detected:', healthData.details)
}
```

## 🔄 Job Lifecycle

1. **Trigger Evaluation** - Scheduler evaluates active rules against current data
2. **Job Creation** - Matching triggers create jobs in the queue
3. **Job Processing** - Worker claims and processes jobs
4. **Condition Evaluation** - Runtime condition checking
5. **Action Execution** - Sequential action processing
6. **Audit Logging** - Comprehensive execution logging
7. **Retry Logic** - Exponential backoff for failed jobs

## 🛠️ Error Handling

### Circuit Breaker Pattern
The system implements a circuit breaker to prevent cascade failures:
- Opens after 5 consecutive failures
- Resets after 60 seconds
- Provides system stability under load

### Retry Logic
Failed jobs are automatically retried:
- Maximum 3 attempts per job
- Exponential backoff: 2^attempt minutes
- Maximum delay: 1 hour
- Jitter added to prevent thundering herd

### Error Categories
- **Validation Errors** - Invalid rule configuration
- **Resource Errors** - Missing employees, forms, templates
- **Network Errors** - External API failures
- **System Errors** - Database or infrastructure issues

## 📈 Performance

### Metrics Collected
- Jobs processed per minute/hour
- Success/failure rates
- Average execution time
- Queue depth over time
- Circuit breaker events

### Optimization Features
- Database-based queue for serverless compatibility
- Efficient job prioritization
- Rate limiting to prevent system overload
- Connection pooling and query optimization

## 🔐 Security

### Multi-tenancy
- All operations scoped to company ID
- Strict data isolation between companies
- Permission-based access control

### Audit Trail
- Complete execution logging
- Actor tracking for all operations
- Change history for all configurations
- Compliance-ready audit logs

## 🧪 Testing

The system includes comprehensive test coverage:

### Unit Tests
- Queue operations
- Rule evaluation logic
- Action execution
- API endpoints

### Integration Tests
- End-to-end workflows
- Multi-component interactions
- Error handling scenarios
- Audit logging verification

### Component Tests
- UI component behavior
- Form validation
- API integration patterns

Run tests with:
```bash
npm test tests/automation/**/*.test.ts
```

## 🚀 Deployment

### Serverless Deployment (Vercel)

1. **Environment Variables**
```bash
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret
CRON_SECRET=your-cron-secret
```

2. **Cron Jobs** (`vercel.json`)
```json
{
  "crons": [
    {
      "path": "/api/cron/automation-triggers",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

3. **Database Setup**
```bash
npx prisma migrate deploy
npx prisma generate
```

### Traditional Deployment

For traditional server deployments, start the worker process:

```typescript
import { startAutomationSystem } from '@/lib/automation'

// Start worker and scheduler
await startAutomationSystem()

// Graceful shutdown is handled automatically
```

## 🔧 Maintenance

### Cleanup Old Jobs
```typescript
// Clean up jobs older than 30 days
await fetch('/api/automation/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'cleanup',
    olderThanDays: 30
  })
})
```

### System Maintenance
```typescript
// Perform comprehensive maintenance
await fetch('/api/automation/status', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'maintenance'
  })
})
```

## 📝 Troubleshooting

### Common Issues

1. **Jobs Not Processing**
   - Check worker health status
   - Verify database connectivity
   - Check for circuit breaker activation

2. **High Failure Rate**
   - Review error logs in executions
   - Check rule configurations
   - Verify external API availability

3. **Performance Issues**
   - Monitor queue depth
   - Check database query performance
   - Review concurrent job limits

### Debug Mode
Enable detailed logging in development:
```bash
NODE_ENV=development npm start
```

## 🤝 Contributing

When extending the automation system:

1. **Add New Trigger Types**
   - Update `AutomationTriggerType` enum in schema
   - Implement trigger handler in `evaluator.ts`
   - Add UI configuration in automation rules page

2. **Add New Action Types**
   - Implement action executor in `executor.ts`
   - Add configuration UI components
   - Update validation schemas

3. **Add New Condition Types**
   - Implement condition evaluator in `evaluator.ts`
   - Add UI configuration options
   - Update validation logic

Remember to:
- Add comprehensive tests
- Update documentation
- Follow existing patterns
- Ensure multi-tenant compatibility

## 📄 License

This automation system is part of the CoreNZ HR platform and follows the same licensing terms.
