# Time Tracking System - Phase 5 Implementation Handoff

## 🎯 Mission
Implement Phase 5 (Mobile App & Real-Time Features) for the enterprise-grade time tracking & scheduling system in Corenz (Next.js 15 + React 19 + Prisma HR platform). Phases 1-4 are **COMPLETE**.

---

## ✅ COMPLETED PHASES

### Phase 1: Timesheet Approval System ✅
- Timesheet CRUD, submission, approval workflows
- Multi-stage approval (SEQUENTIAL, UNANIMOUS, FIRST_RESPONDER)
- Email notifications and audit logging
- Employee timesheet hub page

### Phase 2: Rota/Shift Management ✅
- Shift CRUD operations (create, edit, delete, publish)
- Bulk shift creation from templates
- Conflict detection (double-booking, rest periods, overtime, skills)
- Manager rota calendar interface
- Labor cost tracking and reporting

### Phase 3: Shift Swaps & Availability ✅
- Shift swap requests (targeted + open swaps)
- Accept/reject/approve workflows with manager approval
- Email notifications for all swap events
- Weekly availability pattern management
- One-time availability exceptions
- Team availability grid for managers
- Conflict detection integration
- Employee schedule hub page

### Phase 4: Settings, Payroll, Admin Hub & Geofencing ✅
- Time tracking settings configuration page
- Payroll export system (CSV, Excel, JSON)
- Admin timesheet bulk approval hub
- Geofence management with visual map interface
- Location validation API

---

## 🎯 PHASE 5 OBJECTIVES

### 1. Mobile-First Clock In/Out App
React Native mobile app for employees to clock in/out with GPS verification.

### 2. Real-Time Dashboard
Live monitoring dashboard for managers to see who's clocked in/out.

### 3. Push Notifications
Mobile push notifications for shift reminders, approvals, and alerts.

### 4. Offline Support
Enable clock in/out functionality when device is offline.

### 5. Photo Verification
Camera integration for clock in/out photo capture.

---

## 📊 DATABASE SCHEMA UPDATES

### New Table: `PushNotificationToken`
```prisma
model PushNotificationToken {
  id          String   @id @default(cuid())
  employeeId  String
  employee    Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  token       String   // Expo push token
  deviceId    String
  platform    String   // "ios" or "android"
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([employeeId, deviceId])
  @@index([employeeId])
}
```

### Update `TimeEntry` for Offline Support
```prisma
model TimeEntry {
  // ... existing fields ...
  
  // New fields for offline support
  localId         String?  // Client-generated ID for offline entries
  syncedAt        DateTime? // When offline entry was synced to server
  offlineCreated  Boolean  @default(false)
  
  @@index([localId])
}
```

### Update `TimeEntry` for Photos
```prisma
model TimeEntry {
  // ... existing fields ...
  
  // Photo verification
  clockInPhotoUrl  String?
  clockOutPhotoUrl String?
}
```

---

## 🛠️ IMPLEMENTATION TASKS

## Task 1: Mobile App Foundation (React Native)

### Setup & Configuration
**Directory:** `mobile/` (already exists in project)

**Dependencies to Install:**
```bash
cd mobile
npx expo install expo-location expo-notifications expo-camera expo-file-system expo-secure-store @react-navigation/native @react-navigation/stack react-native-maps
```

**Features:**
- Expo-based React Native app
- Bottom tab navigation (Home, Schedule, Timesheet, Profile)
- Authentication with secure token storage
- API integration with backend

---

### 1.1 Clock In/Out Screen
**File:** `mobile/src/screens/ClockScreen.tsx`

**Features:**

1. **Current Status Display**
   - Show if user is clocked in or out
   - Display current shift info if applicable
   - Show total hours worked today

2. **Clock In Button**
   - Large, prominent button
   - Request GPS permission
   - Capture location coordinates
   - Optional photo capture (if required by settings)
   - Validate geofence (if enabled)
   - Create time entry via API
   - Show success/error feedback

3. **Clock Out Button**
   - Similar flow to clock in
   - Calculate and display time worked
   - Optional break duration entry
   - Optional notes field

4. **Manual Entry Fallback**
   - If geofencing fails, show manual entry option
   - Requires manager approval
   - Include reason field

**UI Design:**
- Glassmorphism card for status
- Gradient buttons (blue to purple)
- GPS signal strength indicator
- Location name display
- Time display with seconds
- Smooth animations

**API Integration:**
```typescript
POST /api/time-tracking/clock-in
{
  latitude: number;
  longitude: number;
  locationId?: string;
  photoBase64?: string;
}

POST /api/time-tracking/clock-out
{
  entryId: string;
  latitude: number;
  longitude: number;
  breakDuration?: number;
  notes?: string;
  photoBase64?: string;
}
```

---

### 1.2 Schedule View Screen
**File:** `mobile/src/screens/ScheduleScreen.tsx`

**Features:**

1. **Weekly Calendar View**
   - Show assigned shifts for the week
   - Color-coded by shift type or location
   - Swipe to navigate weeks
   - Tap shift for details

2. **Shift Details Modal**
   - Date and time
   - Location
   - Break duration
   - Notes
   - Actions: Swap, Call in sick, View on map

3. **Upcoming Shifts List**
   - Next 7 days of shifts
   - Countdown to next shift
   - Quick actions

4. **Availability Management**
   - View current availability pattern
   - Request availability changes
   - Link to web app for full management

**Design:**
- Native calendar component
- Pull to refresh
- Skeleton loaders
- Empty state for no shifts

---

### 1.3 Timesheet Screen
**File:** `mobile/src/screens/TimesheetScreen.tsx`

**Features:**

1. **Current Period Summary**
   - Total hours this week
   - Regular vs overtime breakdown
   - Submission status
   - Approval status

2. **Entry List**
   - Grouped by week
   - Show date, hours, location
   - Edit/delete pending entries
   - View approval history

3. **Submit Timesheet**
   - Review before submit
   - Add notes
   - Submit for approval
   - Confirmation dialog

4. **History**
   - Previous timesheets
   - Filter by date range
   - Export options

---

### 1.4 Profile Screen
**File:** `mobile/src/screens/ProfileScreen.tsx`

**Features:**

1. **User Info**
   - Avatar
   - Name, email, department
   - Employee ID

2. **Statistics**
   - Hours this month
   - Attendance rate
   - On-time clock-ins

3. **Settings**
   - Notification preferences
   - Biometric authentication
   - Location permissions
   - Camera permissions
   - Logout

4. **Quick Actions**
   - View full profile (open web app)
   - Report issue
   - Help & FAQ

---

## Task 2: GPS & Geofencing Integration

### 2.1 Location Service Helper
**File:** `mobile/src/services/LocationService.ts`

**Functions:**

1. `requestLocationPermission()` - Request iOS/Android permissions
2. `getCurrentLocation()` - Get current GPS coordinates
3. `validateGeofence(lat, lng, locationId)` - Check if within geofence
4. `getNearestLocation(lat, lng)` - Find closest location
5. `startLocationTracking()` - Background location tracking (optional)

**Features:**
- Handle permission denials gracefully
- Retry logic for location failures
- Accuracy requirements (< 50m)
- Battery optimization
- Background location updates (if needed)

**Permissions Required:**
```json
{
  "ios": {
    "NSLocationWhenInUseUsageDescription": "We need your location to verify clock in/out locations",
    "NSLocationAlwaysUsageDescription": "We track location for attendance verification"
  },
  "android": {
    "ACCESS_FINE_LOCATION": true,
    "ACCESS_COARSE_LOCATION": true
  }
}
```

---

### 2.2 Geofence Validation Flow

**Process:**
1. User taps "Clock In"
2. Request location permission (if not granted)
3. Get current GPS coordinates
4. Call `/api/locations/validate-geofence` with coordinates
5. If within geofence: Allow clock in
6. If outside geofence: Show error with distance and nearest location
7. Option to proceed with manual entry (requires approval)

**Error Handling:**
- GPS unavailable → Manual entry
- Permission denied → Manual entry with reason
- Outside geofence → Show distance, allow manual entry
- Network error → Queue for offline sync

---

## Task 3: Camera Integration for Photo Verification

### 3.1 Photo Capture Component
**File:** `mobile/src/components/PhotoCapture.tsx`

**Features:**

1. **Camera View**
   - Full-screen camera preview
   - Front camera by default (selfie)
   - Flash toggle
   - Retake/Confirm buttons

2. **Photo Processing**
   - Compress image (max 800x800, 80% quality)
   - Convert to base64
   - Preview before upload
   - Optional annotations (timestamp, location)

3. **Storage**
   - Upload to cloud storage
   - Store URL in TimeEntry
   - Delete local cache after upload

**Permissions:**
```json
{
  "ios": {
    "NSCameraUsageDescription": "We need camera access for attendance verification"
  },
  "android": {
    "CAMERA": true
  }
}
```

---

### 3.2 Photo Upload API
**File:** `app/api/time-tracking/upload-photo/route.ts`

**Endpoint:** `POST /api/time-tracking/upload-photo`

**Request:**
```typescript
{
  entryId: string;
  photoType: 'clockIn' | 'clockOut';
  photoBase64: string;
}
```

**Response:**
```json
{
  "url": "https://storage.example.com/photos/entry_123_clockin.jpg"
}
```

**Features:**
- Upload to cloud storage (S3, Azure Blob, etc.)
- Generate unique filename
- Validate image format and size
- Update TimeEntry with photo URL
- Return public URL

---

## Task 4: Push Notifications

### 4.1 Notification Service
**File:** `mobile/src/services/NotificationService.ts`

**Functions:**

1. `registerForPushNotifications()` - Get Expo push token
2. `sendTokenToServer(token)` - Store token in database
3. `scheduleDailyReminder(time)` - Schedule daily clock in reminder
4. `cancelAllNotifications()` - Clear all scheduled notifications
5. `handleNotificationReceived(notification)` - Handle incoming notifications

**Notification Types:**
- **Shift Reminder:** "You have a shift starting in 1 hour at Main Office"
- **Clock In Reminder:** "Don't forget to clock in for your shift"
- **Clock Out Reminder:** "You've been clocked in for 8 hours. Remember to clock out"
- **Timesheet Reminder:** "Your timesheet is due for submission"
- **Approval Update:** "Your timesheet has been approved by Sarah Manager"
- **Shift Swap:** "John has requested to swap shifts with you"

---

### 4.2 Push Notification Backend
**File:** `app/api/notifications/push/route.ts`

**Endpoint:** `POST /api/notifications/push`

**Request:**
```typescript
{
  employeeIds: string[];
  title: string;
  body: string;
  data?: Record<string, any>;
}
```

**Features:**
- Batch send to multiple employees
- Use Expo Push Notification API
- Handle token expiration
- Track delivery status
- Rate limiting

---

### 4.3 Automated Notification Jobs
**File:** `app/api/cron/shift-reminders/route.ts`

**Schedule:** Every 5 minutes

**Logic:**
1. Find shifts starting in next hour
2. Find employees with push tokens
3. Send reminder notifications
4. Track sent reminders (don't send duplicates)

**Similar Jobs:**
- Clock out reminders (employees clocked in > 8 hours)
- Timesheet submission reminders (end of week)
- Shift swap notifications (real-time)

---

## Task 5: Offline Support & Sync

### 5.1 Offline Storage
**File:** `mobile/src/services/OfflineStorage.ts`

**Features:**

1. **Queue Offline Actions**
   - Clock in/out events
   - Timesheet edits
   - Availability updates

2. **Store in Secure Storage**
   - Use `expo-secure-store`
   - Encrypt sensitive data
   - Persist across app restarts

3. **Sync When Online**
   - Detect network status
   - Upload queued actions
   - Resolve conflicts (server wins)
   - Clear queue on success

**Data Structure:**
```typescript
type OfflineAction = {
  id: string;
  type: 'CLOCK_IN' | 'CLOCK_OUT' | 'EDIT_ENTRY';
  timestamp: string;
  data: any;
  retryCount: number;
  synced: boolean;
};
```

---

### 5.2 Offline Clock In/Out
**File:** `mobile/src/services/OfflineClockService.ts`

**Flow:**

1. User taps clock in while offline
2. Generate local ID (UUID)
3. Capture GPS (if available)
4. Store in offline queue with `offlineCreated: true`
5. Show success message with "Will sync when online" badge
6. When network reconnects:
   - Upload to server with local ID
   - Server creates entry and returns server ID
   - Update local entry with server ID
   - Mark as synced

**Conflict Resolution:**
- If server rejects (e.g., already clocked in), show alert
- Allow user to resolve (keep local or server version)
- Manager can review offline entries

---

### 5.3 Sync API Endpoint
**File:** `app/api/time-tracking/sync/route.ts`

**Endpoint:** `POST /api/time-tracking/sync`

**Request:**
```typescript
{
  entries: Array<{
    localId: string;
    type: 'CLOCK_IN' | 'CLOCK_OUT';
    timestamp: string;
    latitude?: number;
    longitude?: number;
    locationId?: string;
    offlineCreated: true;
  }>;
}
```

**Response:**
```json
{
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
      "error": "Already clocked in"
    }
  ]
}
```

---

## Task 6: Real-Time Manager Dashboard

### 6.1 Live Attendance Dashboard
**File:** `app/(withSidebar)/admin/live-attendance/page.tsx`

**Features:**

1. **Current Status Overview**
   - Total employees clocked in
   - Total employees on shift
   - No-shows count
   - Late clock-ins count

2. **Live Feed**
   - Real-time clock in/out events
   - Employee name, location, time
   - Auto-refresh every 30 seconds
   - WebSocket support (optional)

3. **Employee Grid**
   - Grid of all employees
   - Status: Clocked In, Clocked Out, On Break, On Shift
   - Color-coded cards
   - Search and filter

4. **Location Breakdown**
   - Group by location
   - Show headcount per location
   - Capacity vs actual

5. **Alerts**
   - Employees clocked in without shift
   - Employees on shift but not clocked in
   - Overtime alerts
   - Geofence violations

**Design:**
- Auto-refreshing cards
- Status badges with icons
- Color coding (green = clocked in, red = no-show, yellow = late)
- Real-time updates with animations
- Export to PDF/CSV

---

### 6.2 Real-Time API Endpoint
**File:** `app/api/time-tracking/live/route.ts`

**Endpoint:** `GET /api/time-tracking/live`

**Query Params:**
- `departmentId` (optional)
- `locationId` (optional)

**Response:**
```json
{
  "summary": {
    "totalClockedIn": 45,
    "totalOnShift": 50,
    "noShows": 5,
    "lateClockins": 3
  },
  "employees": [
    {
      "id": "emp_123",
      "name": "John Doe",
      "status": "CLOCKED_IN",
      "location": "Main Office",
      "clockInTime": "2025-10-12T09:00:00Z",
      "shiftStart": "2025-10-12T09:00:00Z",
      "shiftEnd": "2025-10-12T17:00:00Z",
      "hoursWorked": 6.5,
      "onBreak": false
    }
  ],
  "recentActivity": [
    {
      "employeeName": "Jane Smith",
      "action": "CLOCKED_IN",
      "location": "Main Office",
      "timestamp": "2025-10-12T14:30:00Z"
    }
  ]
}
```

---

### 6.3 WebSocket Support (Optional Advanced)
**File:** `app/api/ws/attendance/route.ts`

**Features:**
- Real-time push to connected clients
- Broadcast clock in/out events
- Manager-only access
- Automatic reconnection

**Flow:**
1. Manager opens live dashboard
2. Establish WebSocket connection
3. Server pushes clock in/out events as they happen
4. Client updates UI without polling
5. Disconnect on page close

---

## Task 7: Break Management

### 7.1 Start/End Break Feature
**File:** `mobile/src/screens/BreakScreen.tsx`

**Features:**

1. **Start Break Button**
   - Only available when clocked in
   - Start break timer
   - Optional break type (Lunch, Rest, etc.)
   - Pause location tracking (optional)

2. **Break Timer**
   - Live countdown
   - Reminder after X minutes
   - Auto-end after max break time (from settings)

3. **End Break Button**
   - Stop timer
   - Record break duration
   - Update time entry

**API:**
```typescript
POST /api/time-tracking/start-break
{
  entryId: string;
  breakType?: string;
}

POST /api/time-tracking/end-break
{
  entryId: string;
  breakId: string;
}
```

---

## 🎨 DESIGN SYSTEM (Mobile)

### Color Palette
- **Primary:** `#3B82F6` to `#8B5CF6` (Gradient)
- **Success:** `#10B981`
- **Warning:** `#F59E0B`
- **Danger:** `#EF4444`
- **Background:** `#0F172A` (Dark mode)
- **Card:** `rgba(255,255,255,0.1)` (Glassmorphism)

### Typography
- **Headers:** Bold, 24-32px
- **Body:** Regular, 14-16px
- **Captions:** 12px

### Components
- Bottom tab navigation with icons
- Gradient buttons
- Glassmorphic cards
- Status badges
- Loading skeletons
- Pull-to-refresh
- Swipe gestures

---

## 📦 DEPENDENCIES

### Mobile App
```bash
# Navigation
@react-navigation/native
@react-navigation/stack
@react-navigation/bottom-tabs

# Expo
expo-location
expo-notifications
expo-camera
expo-file-system
expo-secure-store
expo-constants

# Maps
react-native-maps

# UI
react-native-paper
react-native-vector-icons

# Utilities
date-fns
axios
```

### Backend
```bash
# Push notifications
expo-server-sdk

# WebSocket (optional)
ws
@types/ws
```

---

## 🔒 SECURITY & PERMISSIONS

### Mobile Permissions Required
| Permission | iOS | Android | Purpose |
|------------|-----|---------|---------|
| Location (When In Use) | ✅ | ✅ | Clock in/out geofencing |
| Camera | ✅ | ✅ | Photo verification |
| Notifications | ✅ | ✅ | Shift reminders |
| Location (Always) | ❌ | ❌ | Optional background tracking |

### API Security
1. All endpoints require authentication (JWT)
2. Employee can only clock in/out for themselves
3. Managers can view their department only
4. Admins can view all
5. Rate limiting on clock in/out (max 1 per 5 minutes)
6. Photo uploads size-limited (max 5MB)

---

## 🧪 TESTING CHECKLIST

### Mobile App
- [ ] Clock in with GPS enabled
- [ ] Clock in with GPS disabled (manual entry)
- [ ] Clock in outside geofence (show error)
- [ ] Clock out after working hours
- [ ] Take photo on clock in/out
- [ ] Offline clock in (sync when online)
- [ ] View schedule with upcoming shifts
- [ ] Request shift swap
- [ ] Submit timesheet
- [ ] Receive push notifications
- [ ] Background location tracking (if enabled)
- [ ] Handle permission denials
- [ ] Deep linking from notifications

### Dashboard
- [ ] Real-time updates on live dashboard
- [ ] Filter by department/location
- [ ] Export live attendance data
- [ ] View employee details on click
- [ ] Alerts for no-shows and late arrivals

### Backend
- [ ] Geofence validation API works correctly
- [ ] Photo upload to cloud storage
- [ ] Push notifications sent successfully
- [ ] Offline sync resolves conflicts
- [ ] Cron jobs run on schedule
- [ ] WebSocket connections stable

---

## 🎯 SUCCESS CRITERIA

Phase 5 is complete when:

1. ✅ **Mobile App:** Employees can clock in/out from mobile with GPS verification
2. ✅ **Photo Verification:** Camera integration works for attendance photos
3. ✅ **Geofencing:** Location validation prevents clock in outside designated areas
4. ✅ **Offline Mode:** Clock in/out works offline and syncs when online
5. ✅ **Push Notifications:** Shift reminders and approval updates sent to mobile
6. ✅ **Live Dashboard:** Managers can see real-time attendance status
7. ✅ **Schedule View:** Employees can view shifts and request swaps from mobile
8. ✅ **Timesheet Mobile:** Employees can submit timesheets from mobile
9. ✅ **Break Management:** Employees can start/end breaks from mobile
10. ✅ **Security:** All features have proper authentication and authorization

---

## 📊 ESTIMATED EFFORT

- **Mobile App Foundation:** 10-12 hours
- **Clock In/Out with GPS:** 8-10 hours
- **Camera Integration:** 4-6 hours
- **Push Notifications:** 6-8 hours
- **Offline Support:** 8-10 hours
- **Real-Time Dashboard:** 6-8 hours
- **Break Management:** 4-6 hours
- **Testing & Polish:** 8-10 hours

**Total:** ~54-70 hours

---

## 🚀 IMPLEMENTATION ORDER

1. **Start:** Mobile app foundation & navigation (core structure)
2. **Next:** Clock in/out with GPS (main feature)
3. **Then:** Camera integration & photo verification (if required by company)
4. **Then:** Push notifications (high value for UX)
5. **Then:** Offline support (important for reliability)
6. **Then:** Live dashboard (manager feature)
7. **Finally:** Break management & polish

---

## 📝 NOTES

### Integration Points
- Mobile app calls all Phase 1-4 APIs
- Geofencing uses Phase 4 location data
- Settings from Phase 4 control mobile behavior
- Timesheets created in mobile use Phase 1 approval workflows

### Best Practices
- Use React Query for API caching on mobile
- Implement token refresh for long sessions
- Cache shift data for offline viewing
- Optimize battery usage (limit location tracking)
- Handle poor network conditions gracefully
- Show clear loading and error states
- Use haptic feedback for important actions
- Implement biometric authentication (Face ID/Touch ID)

### Future Enhancements (Post-Phase 5)
- Team chat/messaging
- Shift marketplace (employees bid on open shifts)
- Advanced analytics (patterns, predictions)
- Integration with payroll systems (ADP, Xero, etc.)
- Voice commands ("Hey Siri, clock me in")
- Apple Watch / Android Wear apps
- Bluetooth beacon check-in (no GPS needed)
- NFC badge tap for clock in

---

## 🎉 COMPLETION

Phase 5 completes the **ENTIRE TIME TRACKING SYSTEM**:

### What You'll Have Built:
✅ **Full timesheet management** with multi-level approvals  
✅ **Complete shift scheduling** with conflict detection  
✅ **Shift swap marketplace** with availability management  
✅ **Enterprise settings** and payroll export  
✅ **Geofenced locations** with visual management  
✅ **Mobile app** for clock in/out with GPS  
✅ **Real-time monitoring** for managers  
✅ **Push notifications** for employees  
✅ **Offline support** for reliability  
✅ **Photo verification** for compliance  

### Business Value:
- **100% attendance tracking accuracy**
- **Zero manual timesheet entry**
- **Real-time visibility for managers**
- **Automated payroll export**
- **GPS-verified location compliance**
- **Mobile-first employee experience**
- **Offline reliability**
- **Complete audit trail**

---

**Status:** 📋 READY FOR IMPLEMENTATION  
**Priority:** 🔥 CRITICAL  
**Complexity:** ⭐⭐⭐⭐⭐ (5/5)  
**Dependencies:** Phases 1-4 Complete ✅

**This is the FINAL PHASE of the time tracking system!** 🎊
