# Time Tracking Phase 5 - API Reference

Quick reference for all Phase 5 endpoints and their usage.

---

## 🔐 Authentication

All endpoints require authentication via `getServerSession(authOptions)`.

**Headers Required:**
```
Authorization: Bearer <session-token>
Cookie: next-auth.session-token=<token>
```

---

## 📱 Mobile Clock In/Out

### POST /api/time-tracking/clock-in

Clock in an employee with location verification.

**Request:**
```json
{
  "location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "accuracy": 15
  },
  "photoUrl": "https://storage.example.com/photo.jpg",
  "deviceInfo": {
    "device": "iPhone 14 Pro",
    "os": "iOS 17",
    "browser": "Mobile Safari"
  },
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "clockEntry": {
    "id": "entry_123",
    "employeeId": "emp_456",
    "clockInTime": "2025-01-12T09:00:00Z",
    "status": "ACTIVE"
  },
  "message": "Clocked in successfully"
}
```

**Errors:**
- `400` - Already clocked in
- `400` - GPS location required
- `400` - Location verification failed
- `401` - Unauthorized
- `404` - Employee not found

---

### POST /api/time-tracking/clock-out

Clock out an employee.

**Request:**
```json
{
  "location": {
    "lat": 40.7128,
    "lng": -74.0060,
    "accuracy": 20
  },
  "breakDuration": 30,
  "photoUrl": "https://storage.example.com/photo.jpg",
  "notes": "Completed shift"
}
```

**Response:**
```json
{
  "success": true,
  "clockEntry": {
    "id": "entry_123",
    "clockInTime": "2025-01-12T09:00:00Z",
    "clockOutTime": "2025-01-12T17:00:00Z",
    "status": "COMPLETED"
  },
  "hoursWorked": 7.5,
  "message": "Clocked out successfully"
}
```

---

### GET /api/time-tracking/status

Get current clock in/out status.

**Response:**
```json
{
  "isClockedIn": true,
  "activeEntry": {
    "id": "entry_123",
    "clockInTime": "2025-01-12T09:00:00Z",
    "status": "ACTIVE"
  },
  "duration": {
    "hours": 6,
    "minutes": 30,
    "totalMinutes": 390
  }
}
```

---

## 📸 Photo Verification

### POST /api/time-tracking/upload-photo

Upload attendance verification photo.

**Request:**
```json
{
  "entryId": "entry_123",
  "photoType": "clockIn",
  "photoBase64": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
}
```

**Response:**
```json
{
  "success": true,
  "url": "https://storage.example.com/photos/entry_123_clockin.jpg",
  "message": "Photo uploaded successfully"
}
```

**Validation:**
- Max size: 5MB
- Formats: JPEG, PNG
- photoType: `clockIn` or `clockOut`

---

## 🔄 Offline Sync

### POST /api/time-tracking/sync

Batch sync offline clock entries.

**Request:**
```json
{
  "entries": [
    {
      "localId": "uuid-1",
      "type": "CLOCK_IN",
      "timestamp": "2025-01-12T09:00:00Z",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "accuracy": 15,
      "offlineCreated": true
    },
    {
      "localId": "uuid-2",
      "type": "CLOCK_OUT",
      "timestamp": "2025-01-12T17:00:00Z",
      "latitude": 40.7128,
      "longitude": -74.0060,
      "breakDuration": 30,
      "offlineCreated": true
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "synced": [
    {
      "localId": "uuid-1",
      "serverId": "entry_123",
      "success": true
    }
  ],
  "failed": [
    {
      "localId": "uuid-2",
      "error": "Already clocked out"
    }
  ],
  "summary": {
    "total": 2,
    "succeeded": 1,
    "failed": 1
  }
}
```

---

## ⏸️ Break Management

### POST /api/time-tracking/start-break

Start a break.

**Request:**
```json
{
  "entryId": "entry_123",
  "breakType": "MEAL_BREAK"
}
```

**Response:**
```json
{
  "success": true,
  "breakRecord": {
    "id": "break_456",
    "startTime": "2025-01-12T12:00:00Z",
    "breakType": "MEAL_BREAK"
  },
  "message": "Break started successfully"
}
```

**Break Types:**
- `MEAL_BREAK` - 30-60 min meal break
- `REST_BREAK` - 10-15 min rest break
- `UNPAID_BREAK` - Unpaid break

---

### POST /api/time-tracking/end-break

End a break.

**Request:**
```json
{
  "breakId": "break_456"
}
```

**Response:**
```json
{
  "success": true,
  "breakRecord": {
    "id": "break_456",
    "startTime": "2025-01-12T12:00:00Z",
    "endTime": "2025-01-12T12:30:00Z",
    "duration": 30
  },
  "duration": {
    "minutes": 30,
    "formatted": "0h 30m"
  },
  "message": "Break ended successfully"
}
```

---

## 🔔 Push Notifications

### POST /api/notifications/register-token

Register device for push notifications.

**Request:**
```json
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "deviceId": "ios_iPhone14Pro_iOS17.0",
  "platform": "ios"
}
```

**Response:**
```json
{
  "success": true,
  "token": {
    "id": "token_123",
    "employeeId": "emp_456",
    "token": "ExponentPushToken[...]",
    "isActive": true
  },
  "message": "Push notification token registered successfully"
}
```

---

### DELETE /api/notifications/register-token?deviceId={deviceId}

Unregister device.

**Response:**
```json
{
  "success": true,
  "message": "Push notification token unregistered successfully"
}
```

---

### POST /api/notifications/push

Send push notifications (Manager/Admin only).

**Request:**
```json
{
  "employeeIds": ["emp_1", "emp_2"],
  "title": "Shift Reminder",
  "body": "Your shift starts in 1 hour",
  "data": {
    "type": "SHIFT_REMINDER",
    "shiftId": "shift_123"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "message": "Push notifications sent to 2 device(s)"
}
```

**Permissions:** Requires `MANAGER` or `ADMIN` role

---

## 📊 Real-Time Dashboard

### GET /api/time-tracking/live

Get live attendance data.

**Query Parameters:**
- `departmentId` (optional) - Filter by department
- `locationId` (optional) - Filter by location

**Response:**
```json
{
  "summary": {
    "totalEmployees": 50,
    "totalClockedIn": 45,
    "totalClockedOut": 5,
    "attendanceRate": "90.0"
  },
  "employees": [
    {
      "id": "emp_123",
      "name": "John Doe",
      "email": "john@example.com",
      "department": "Engineering",
      "location": "Main Office",
      "status": "CLOCKED_IN",
      "clockInTime": "2025-01-12T09:00:00Z",
      "hoursWorked": 6.5,
      "clockInLocation": {
        "lat": 40.7128,
        "lng": -74.0060
      }
    }
  ],
  "recentActivity": [
    {
      "employeeName": "Jane Smith",
      "action": "CLOCKED_IN",
      "location": "Main Office",
      "timestamp": "2025-01-12T14:30:00Z"
    }
  ],
  "timestamp": "2025-01-12T15:00:00Z"
}
```

**Permissions:** Requires `MANAGER` or `ADMIN` role

---

## ⏰ Automated Jobs

### GET /api/cron/shift-reminders

Send shift reminder notifications (Cron job).

**Headers Required:**
```
Authorization: Bearer {CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "message": "Shift reminder cron job executed",
  "timestamp": "2025-01-12T15:00:00Z",
  "processed": 10
}
```

**Schedule:** Run every 15 minutes (Vercel Cron)

---

## 🔍 Location Validation

Location validation happens automatically in clock-in endpoint.

**Geofence Check:**
1. Get employee's GPS coordinates
2. Compare to company geofence locations
3. Calculate distance using Haversine formula
4. Allow if within radius, reject if outside

**Fallback:**
- If GPS fails → Allow manual entry (requires manager approval)
- If outside geofence → Show distance and allow manual entry
- If location services disabled → Prompt to enable

---

## 📈 Response Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad Request - Validation error |
| `401` | Unauthorized - Not authenticated |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `500` | Internal Server Error |

---

## 🛠️ Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error message",
  "details": {
    "field": "validation error"
  }
}
```

**Validation Errors (Zod):**
```json
{
  "error": "Invalid request data",
  "details": [
    {
      "code": "invalid_type",
      "expected": "number",
      "received": "string",
      "path": ["location", "lat"],
      "message": "Expected number, received string"
    }
  ]
}
```

---

## 🔐 Security Notes

1. **Rate Limiting:** Clock in/out limited to 1 request per 5 minutes per employee
2. **Data Scoping:** All queries filtered by `companyId`
3. **Ownership Validation:** Employees can only access their own data
4. **Manager Restrictions:** Live dashboard and push notifications require elevated permissions
5. **Photo Size Limits:** Max 5MB per photo upload
6. **Token Expiration:** Push notification tokens expire after 30 days of inactivity

---

## 📱 Mobile Service Integration

### LocationService.ts

```typescript
import { getCurrentLocation, validateGeofence } from '@/services/LocationService';

// Get current location
const location = await getCurrentLocation();
// Returns: { latitude: number, longitude: number, accuracy?: number }

// Validate geofence
const result = await validateGeofence(location, geofences);
// Returns: { isValid: boolean, distance?: number, error?: string }
```

### NotificationService.ts

```typescript
import { registerForPushNotifications, sendTokenToServer } from '@/services/NotificationService';

// Register for notifications
const token = await registerForPushNotifications();
if (token) {
  await sendTokenToServer(token);
}
```

### OfflineClockService.ts

```typescript
import { clockInOffline, clockOutOffline, syncOfflineActions } from '@/services/OfflineClockService';

// Clock in (works offline)
const result = await clockInOffline(photoBase64, notes);
// Returns: { success: boolean, localId: string, offlineMode: boolean }

// Sync when online
const syncResult = await syncOfflineActions();
// Returns: { success: boolean, synced: number, failed: number }
```

---

## 🧪 Testing Examples

### Test Clock In

```bash
curl -X POST http://localhost:3000/api/time-tracking/clock-in \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -d '{
    "location": {
      "lat": 40.7128,
      "lng": -74.0060,
      "accuracy": 10
    }
  }'
```

### Test Push Notification

```bash
curl -X POST http://localhost:3000/api/notifications/push \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=MANAGER_TOKEN" \
  -d '{
    "employeeIds": ["emp_123"],
    "title": "Test",
    "body": "Test notification"
  }'
```

### Test Live Dashboard

```bash
curl http://localhost:3000/api/time-tracking/live \
  -H "Cookie: next-auth.session-token=MANAGER_TOKEN"
```

---

**Version:** 1.0.0  
**Last Updated:** January 12, 2025  
**Status:** Production Ready ✅
